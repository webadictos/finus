'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

type Frecuencia = 'mensual' | 'quincenal' | 'semanal' | 'anual'

function siguienteFecha(fecha: string, frecuencia: Frecuencia): string {
  const d = new Date(fecha + 'T12:00:00')
  switch (frecuencia) {
    case 'mensual':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quincenal':
      d.setDate(d.getDate() + 15)
      break
    case 'semanal':
      d.setDate(d.getDate() + 7)
      break
    case 'anual':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split('T')[0]
}

export async function crearIngreso(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const esRecurrente = formData.get('es_recurrente') === 'true'
  const frecuencia = (formData.get('frecuencia') as Frecuencia | null) || null

  const cuentaDestinoId = (formData.get('cuenta_destino_id') as string) || null

  const { error } = await supabase.from('ingresos').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    tipo: formData.get('tipo') as 'fijo_recurrente' | 'proyecto_recurrente' | 'unico',
    monto_esperado: parseFloat(formData.get('monto_esperado') as string) || null,
    fecha_esperada: (formData.get('fecha_esperada') as string) || null,
    probabilidad: (formData.get('probabilidad') as 'alta' | 'media' | 'baja') || 'media',
    estado: 'esperado',
    es_recurrente: esRecurrente,
    frecuencia: esRecurrente ? frecuencia : null,
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

  const esRecurrente = formData.get('es_recurrente') === 'true'
  const frecuencia = (formData.get('frecuencia') as Frecuencia | null) || null

  const cuentaDestinoId = (formData.get('cuenta_destino_id') as string) || null

  const { error } = await supabase
    .from('ingresos')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      tipo: formData.get('tipo') as 'fijo_recurrente' | 'proyecto_recurrente' | 'unico',
      monto_esperado: parseFloat(formData.get('monto_esperado') as string) || null,
      fecha_esperada: (formData.get('fecha_esperada') as string) || null,
      probabilidad: (formData.get('probabilidad') as 'alta' | 'media' | 'baja') || 'media',
      es_recurrente: esRecurrente,
      frecuencia: esRecurrente ? frecuencia : null,
      cuenta_destino_id: cuentaDestinoId,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}

export async function confirmarIngreso(
  id: string,
  montoReal: number,
  fechaReal: string
): Promise<ActionResult> {
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

  // 1. Confirmar el ingreso
  const { error: updateErr } = await supabase
    .from('ingresos')
    .update({
      estado: 'confirmado' as const,
      monto_real: montoReal,
      fecha_real: fechaReal,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // 2. Crear transacción de ingreso
  const { error: txErr } = await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'ingreso' as const,
    monto: montoReal,
    fecha: fechaReal,
    descripcion: ingreso.nombre,
    cuenta_id: ingreso.cuenta_destino_id,
  })

  if (txErr) return { error: txErr.message }

  // 3. Actualizar saldo de la cuenta destino
  if (ingreso.cuenta_destino_id) {
    await supabase.rpc('incrementar_saldo', {
      p_cuenta_id: ingreso.cuenta_destino_id,
      p_monto: montoReal,
    })
  }

  // 4. Si es recurrente, generar la siguiente instancia
  if (ingreso.es_recurrente && ingreso.fecha_esperada && ingreso.frecuencia) {
    const nextFecha = siguienteFecha(
      ingreso.fecha_esperada,
      ingreso.frecuencia as Frecuencia
    )

    await supabase.from('ingresos').insert({
      usuario_id: user.id,
      nombre: ingreso.nombre,
      tipo: ingreso.tipo,
      es_recurrente: true,
      frecuencia: ingreso.frecuencia,
      dia_del_mes: ingreso.dia_del_mes,
      monto_fijo: ingreso.monto_fijo,
      monto_esperado: ingreso.monto_fijo ?? ingreso.monto_esperado,
      fecha_esperada: nextFecha,
      estado: 'esperado' as const,
      probabilidad: ingreso.probabilidad ?? 'alta',
      cuenta_destino_id: ingreso.cuenta_destino_id,
    })
  }

  revalidatePath('/ingresos')
  revalidatePath('/')
  return {}
}
