'use server'

import {
  calcularSiguienteFechaIngreso,
  getIngresoRecurrenceBaseDate,
  resolveIngresoDiaDelMes,
} from '@/lib/ingresos'
import { getTodayLocalISO } from '@/lib/local-date'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }
export type ConfirmarIngresoResult = {
  error?: string
  transaccionId?: string
  nextIngresoId?: string | null
}

type Frecuencia = 'mensual' | 'quincenal' | 'semanal' | 'anual'

function getRecurringIngresoPayload(formData: FormData) {
  const esRecurrente = formData.get('es_recurrente') === 'true'
  const frecuencia = (formData.get('frecuencia') as Frecuencia | null) || null
  const fechaEsperada = (formData.get('fecha_esperada') as string) || null
  const montoEsperado = parseFloat(formData.get('monto_esperado') as string) || null
  const diaDelMes =
    esRecurrente && frecuencia === 'mensual'
      ? resolveIngresoDiaDelMes(fechaEsperada)
      : null
  const montoFijo = esRecurrente ? montoEsperado : null

  return {
    esRecurrente,
    frecuencia,
    fechaEsperada,
    montoEsperado,
    diaDelMes,
    montoFijo,
  }
}

export async function crearIngreso(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const {
    esRecurrente,
    frecuencia,
    fechaEsperada,
    montoEsperado,
    diaDelMes,
    montoFijo,
  } = getRecurringIngresoPayload(formData)

  const cuentaDestinoId = (formData.get('cuenta_destino_id') as string) || null

  const { error } = await supabase.from('ingresos').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    tipo: formData.get('tipo') as 'fijo_recurrente' | 'proyecto_recurrente' | 'unico',
    monto_esperado: montoEsperado,
    monto_fijo: montoFijo,
    fecha_esperada: fechaEsperada,
    probabilidad: (formData.get('probabilidad') as 'alta' | 'media' | 'baja') || 'media',
    estado: 'esperado',
    es_recurrente: esRecurrente,
    frecuencia: esRecurrente ? frecuencia : null,
    dia_del_mes: diaDelMes,
    cuenta_destino_id: cuentaDestinoId,
  })

  if (error) return { error: error.message }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}

export async function actualizarIngreso(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener estado actual antes de actualizar para gestionar saldo si está confirmado
  const { data: actual, error: fetchErr } = await supabase
    .from('ingresos')
    .select('estado, cuenta_destino_id, monto_real, monto_esperado')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !actual) return { error: 'Ingreso no encontrado' }

  const {
    esRecurrente,
    frecuencia,
    fechaEsperada,
    montoEsperado,
    diaDelMes,
    montoFijo,
  } = getRecurringIngresoPayload(formData)
  const nuevaCuentaId = (formData.get('cuenta_destino_id') as string) || null

  const { error } = await supabase
    .from('ingresos')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      tipo: formData.get('tipo') as 'fijo_recurrente' | 'proyecto_recurrente' | 'unico',
      monto_esperado: montoEsperado,
      monto_fijo: montoFijo,
      fecha_esperada: fechaEsperada,
      probabilidad: (formData.get('probabilidad') as 'alta' | 'media' | 'baja') || 'media',
      es_recurrente: esRecurrente,
      frecuencia: esRecurrente ? frecuencia : null,
      dia_del_mes: diaDelMes,
      cuenta_destino_id: nuevaCuentaId,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  // Ajustar saldos solo si el ingreso ya está confirmado y cambió la cuenta
  if (actual.estado === 'confirmado') {
    const cuentaAnterior = actual.cuenta_destino_id
    const monto = Number(actual.monto_real ?? actual.monto_esperado ?? 0)

    const cambioRealDeCuenta = cuentaAnterior !== nuevaCuentaId

    if (cambioRealDeCuenta && monto > 0) {
      // Revertir saldo de la cuenta anterior (si tenía una)
      if (cuentaAnterior) {
        await supabase.rpc('decrementar_saldo', {
          p_cuenta_id: cuentaAnterior,
          p_monto: monto,
        })
      }
      // Aplicar saldo a la nueva cuenta (si se asignó una)
      if (nuevaCuentaId) {
        await supabase.rpc('incrementar_saldo', {
          p_cuenta_id: nuevaCuentaId,
          p_monto: monto,
        })
      }
    }
  }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}

export async function confirmarIngreso(
  id: string,
  montoReal: number,
  fechaReal: string,
  /** Cuenta seleccionada en el modal cuando el ingreso no tenía cuenta_destino_id */
  cuentaIdOverride?: string | null
): Promise<ConfirmarIngresoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener el ingreso completo para la lógica de recurrencia
  const { data: ingreso, error: fetchErr } = await supabase
    .from('ingresos')
    .select('nombre, tipo, es_recurrente, frecuencia, dia_del_mes, monto_fijo, monto_esperado, fecha_esperada, probabilidad, cuenta_destino_id')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !ingreso) return { error: 'Ingreso no encontrado' }

  // La cuenta efectiva: override del modal > cuenta_destino_id del ingreso
  const efectivaCuentaId =
    cuentaIdOverride !== undefined ? cuentaIdOverride : ingreso.cuenta_destino_id

  // 1. Confirmar el ingreso (y guardar cuenta efectiva si fue seleccionada ahora)
  const { error: updateErr } = await supabase
    .from('ingresos')
    .update({
      estado: 'confirmado' as const,
      monto_real: montoReal,
      fecha_real: fechaReal,
      cuenta_destino_id: efectivaCuentaId,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // 2. Crear transacción de ingreso
  const { data: txData, error: txErr } = await supabase
    .from('transacciones')
    .insert({
      usuario_id: user.id,
      tipo: 'ingreso' as const,
      monto: montoReal,
      fecha: fechaReal,
      descripcion: ingreso.nombre,
      cuenta_id: efectivaCuentaId,
    })
    .select('id')
    .single()

  if (txErr) return { error: txErr.message }

  // 3. Actualizar saldo de la cuenta destino
  if (efectivaCuentaId) {
    await supabase.rpc('incrementar_saldo', {
      p_cuenta_id: efectivaCuentaId,
      p_monto: montoReal,
    })
  }

  // 4. Si es recurrente, generar la siguiente instancia
  let nextIngresoId: string | null = null
  if (ingreso.es_recurrente && ingreso.fecha_esperada && ingreso.frecuencia) {
    const baseFecha = getIngresoRecurrenceBaseDate({
      ...ingreso,
      fecha_real: fechaReal,
    })

    if (!baseFecha) {
      return { error: 'No se pudo calcular la siguiente fecha del ingreso recurrente' }
    }

    const nextFecha = calcularSiguienteFechaIngreso(
      baseFecha,
      ingreso.frecuencia as Frecuencia,
      resolveIngresoDiaDelMes(ingreso.fecha_esperada, ingreso.dia_del_mes)
    )

    const { data: existente } = await supabase
      .from('ingresos')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('nombre', ingreso.nombre)
      .eq('fecha_esperada', nextFecha)
      .neq('estado', 'confirmado')
      .maybeSingle()

    if (existente) {
      nextIngresoId = existente.id
    } else {
      const { data: nextData } = await supabase
        .from('ingresos')
        .insert({
          usuario_id: user.id,
          nombre: ingreso.nombre,
          tipo: ingreso.tipo,
          es_recurrente: true,
          frecuencia: ingreso.frecuencia,
          dia_del_mes: resolveIngresoDiaDelMes(ingreso.fecha_esperada, ingreso.dia_del_mes),
          monto_fijo: ingreso.monto_fijo,
          monto_esperado: ingreso.monto_fijo ?? ingreso.monto_esperado,
          fecha_esperada: nextFecha,
          estado: 'esperado' as const,
          probabilidad: ingreso.probabilidad ?? 'alta',
          // Heredar la cuenta efectiva (no la original pre-confirmación que podría ser null)
          cuenta_destino_id: efectivaCuentaId,
        })
        .select('id')
        .single()

      nextIngresoId = nextData?.id ?? null
    }
  }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return { transaccionId: txData.id, nextIngresoId }
}

export async function deshacerConfirmarIngreso(
  ingresoId: string,
  transaccionId: string,
  cuentaId: string | null,
  monto: number,
  nextIngresoId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Eliminar la transacción
  const { error: txErr } = await supabase
    .from('transacciones')
    .delete()
    .eq('id', transaccionId)
    .eq('usuario_id', user.id)

  if (txErr) return { error: txErr.message }

  // 2. Revertir saldo si aplica
  if (cuentaId) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaId,
      p_monto: monto,
    })
  }

  // 3. Revertir estado del ingreso
  const { error: updateErr } = await supabase
    .from('ingresos')
    .update({ estado: 'esperado' as const, monto_real: null, fecha_real: null })
    .eq('id', ingresoId)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // 4. Eliminar la siguiente instancia generada automáticamente
  if (nextIngresoId) {
    await supabase
      .from('ingresos')
      .delete()
      .eq('id', nextIngresoId)
      .eq('usuario_id', user.id)
  }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}

/**
 * Confirma una instancia "fantasma" (_next) de un ingreso recurrente.
 * Crea el registro real en DB si aún no existe, luego lo confirma.
 */
export async function confirmarIngresoPhantom(
  originalId: string,
  fechaEsperada: string,
  montoReal: number,
  fechaReal: string,
  cuentaIdOverride?: string | null
): Promise<ConfirmarIngresoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener el ingreso original para heredar todos los campos recurrentes
  const { data: original, error: fetchErr } = await supabase
    .from('ingresos')
    .select('*')
    .eq('id', originalId)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !original) return { error: 'Ingreso original no encontrado' }

  // Verificar si ya existe un registro pendiente con la misma fecha (evita duplicados)
  const { data: existente } = await supabase
    .from('ingresos')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('nombre', original.nombre)
    .eq('fecha_esperada', fechaEsperada)
    .neq('estado', 'confirmado')
    .maybeSingle()

  let realId: string
  if (existente) {
    realId = existente.id
  } else {
    // Insertar el registro real de la siguiente instancia
    const { data: inserted, error: insertErr } = await supabase
      .from('ingresos')
      .insert({
        usuario_id: user.id,
        nombre: original.nombre,
        tipo: original.tipo,
        es_recurrente: true,
        frecuencia: original.frecuencia,
        dia_del_mes: original.dia_del_mes,
        monto_fijo: original.monto_fijo,
        monto_esperado: original.monto_fijo ?? original.monto_esperado,
        fecha_esperada: fechaEsperada,
        estado: 'esperado' as const,
        probabilidad: original.probabilidad ?? 'alta',
        cuenta_destino_id: cuentaIdOverride ?? original.cuenta_destino_id,
      })
      .select('id')
      .single()

    if (insertErr || !inserted) return { error: 'No se pudo crear la instancia' }
    realId = inserted.id
  }

  // Delegar al flujo normal de confirmación
  return confirmarIngreso(realId, montoReal, fechaReal, cuentaIdOverride)
}

export async function eliminarIngreso(
  id: string,
  alcance: 'este_mes' | 'todos_siguientes'
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: ingreso, error: fetchErr } = await supabase
    .from('ingresos')
    .select('nombre, estado, cuenta_destino_id, monto_real, monto_esperado, es_recurrente, fecha_esperada')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !ingreso) return { error: 'Ingreso no encontrado' }

  // Revertir saldo si estaba confirmado y tenía cuenta
  if (ingreso.estado === 'confirmado' && ingreso.cuenta_destino_id) {
    const monto = Number(ingreso.monto_real ?? ingreso.monto_esperado ?? 0)
    if (monto > 0) {
      await supabase.rpc('decrementar_saldo', {
        p_cuenta_id: ingreso.cuenta_destino_id,
        p_monto: monto,
      })
    }
  }

  // Eliminar este registro
  const { error: deleteErr } = await supabase
    .from('ingresos')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (deleteErr) return { error: deleteErr.message }

  // Si 'todos_siguientes': eliminar instancias futuras no confirmadas de la misma serie
  if (alcance === 'todos_siguientes' && ingreso.es_recurrente) {
    const hoy = getTodayLocalISO()
    await supabase
      .from('ingresos')
      .delete()
      .eq('usuario_id', user.id)
      .eq('nombre', ingreso.nombre)
      .eq('es_recurrente', true)
      .neq('estado', 'confirmado')
      .gte('fecha_esperada', hoy)
  }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}

/**
 * Acredita un ingreso ya confirmado que no tenía cuenta_destino_id.
 * Actualiza el ingreso, la transacción existente y llama incrementar_saldo.
 */
export async function acreditarIngreso(
  ingresoId: string,
  cuentaId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener el ingreso para saber el monto y datos para buscar la transacción
  const { data: ingreso, error: fetchErr } = await supabase
    .from('ingresos')
    .select('nombre, monto_real, monto_esperado, fecha_real, cuenta_destino_id')
    .eq('id', ingresoId)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !ingreso) return { error: 'Ingreso no encontrado' }
  if (ingreso.cuenta_destino_id) return { error: 'Este ingreso ya tiene cuenta asignada' }

  const monto = Number(ingreso.monto_real ?? ingreso.monto_esperado ?? 0)
  if (monto <= 0) return { error: 'El ingreso no tiene monto registrado' }

  // 1. Actualizar cuenta_destino_id en el ingreso
  const { error: updateErr } = await supabase
    .from('ingresos')
    .update({ cuenta_destino_id: cuentaId })
    .eq('id', ingresoId)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // 2. Actualizar la transacción existente (creada con cuenta_id = null)
  await supabase
    .from('transacciones')
    .update({ cuenta_id: cuentaId })
    .eq('usuario_id', user.id)
    .eq('tipo', 'ingreso')
    .eq('descripcion', ingreso.nombre)
    .eq('fecha', ingreso.fecha_real ?? '')
    .is('cuenta_id', null)

  // 3. Incrementar saldo de la cuenta
  await supabase.rpc('incrementar_saldo', {
    p_cuenta_id: cuentaId,
    p_monto: monto,
  })

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}
