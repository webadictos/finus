'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TipoPago } from '@/types/finus'

export type ActionResult = { error?: string }

export type MarcarPagadoResult = {
  error?: string
  transaccionId?: string
  fechaAnterior?: string | null
  cuentaId?: string | null
  monto?: number
}

export async function crearCargoLinea(
  lineaId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const nombre = (formData.get('nombre') as string).trim()
  const tipo = formData.get('tipo') as 'revolvente' | 'msi' | 'disposicion_efectivo'
  const monto_original = parseFloat(formData.get('monto_original') as string)

  if (!nombre) return { error: 'El nombre es requerido' }
  if (isNaN(monto_original) || monto_original <= 0) return { error: 'El monto original es requerido' }

  let saldo_pendiente: number
  let mensualidades_totales: number | null = null
  let mensualidades_restantes: number | null = null
  let monto_mensualidad: number | null = null
  let tasa_efectiva_anual = 0

  if (tipo === 'revolvente') {
    saldo_pendiente = monto_original
  } else {
    // msi | disposicion_efectivo
    const rawMeses = parseInt(formData.get('mensualidades_totales') as string)
    const rawMensualidad = parseFloat(formData.get('monto_mensualidad') as string)
    const rawTasa = parseFloat(formData.get('tasa_efectiva_anual') as string)

    mensualidades_totales = isNaN(rawMeses) || rawMeses <= 0 ? null : rawMeses
    monto_mensualidad = isNaN(rawMensualidad) || rawMensualidad <= 0 ? null : rawMensualidad
    tasa_efectiva_anual = isNaN(rawTasa) ? 0 : rawTasa
    mensualidades_restantes = mensualidades_totales

    // saldo_pendiente = mensualidad × meses restantes, o monto_original como fallback
    saldo_pendiente =
      monto_mensualidad != null && mensualidades_totales != null
        ? monto_mensualidad * mensualidades_totales
        : monto_original
  }

  const { error } = await supabase.from('cargos_linea').insert({
    linea_credito_id: lineaId,
    usuario_id: user.id,
    nombre,
    tipo,
    monto_original,
    monto_mensualidad,
    mensualidades_totales,
    mensualidades_restantes,
    saldo_pendiente,
    tasa_efectiva_anual,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export async function crearCompromiso(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const tipo_pago = formData.get('tipo_pago') as TipoPago
  const tasaAnual = parseFloat(formData.get('tasa_interes_anual') as string)
  const tarjetaId = (formData.get('tarjeta_id') as string) || null

  const { error } = await supabase.from('compromisos').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    tipo_pago,
    frecuencia: ((formData.get('frecuencia') as string) || null) as 'mensual' | 'quincenal' | 'semanal' | 'anual' | null,
    monto_mensualidad:
      parseFloat(formData.get('monto_mensualidad') as string) || null,
    fecha_proximo_pago: (formData.get('fecha_proximo_pago') as string) || null,
    prioridad: ((formData.get('prioridad') as string) || null) as 'alta' | 'media' | 'baja' | null,
    tarjeta_id: tarjetaId,
    mensualidades_restantes: formData.get('mensualidades_restantes')
      ? parseInt(formData.get('mensualidades_restantes') as string)
      : null,
    fecha_fin_estimada: (formData.get('fecha_fin_estimada') as string) || null,
    meses_totales: formData.get('meses_totales')
      ? parseInt(formData.get('meses_totales') as string)
      : null,
    saldo_real: formData.get('saldo_real')
      ? parseFloat(formData.get('saldo_real') as string)
      : null,
    pago_sin_intereses: formData.get('pago_sin_intereses')
      ? parseFloat(formData.get('pago_sin_intereses') as string)
      : null,
    pago_minimo: formData.get('pago_minimo')
      ? parseFloat(formData.get('pago_minimo') as string)
      : null,
    tasa_interes_anual: !isNaN(tasaAnual) && tasaAnual > 0 ? tasaAnual : null,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export async function actualizarCompromiso(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const tipo_pago = formData.get('tipo_pago') as TipoPago
  const tasaAnual = parseFloat(formData.get('tasa_interes_anual') as string)
  const tarjetaId = (formData.get('tarjeta_id') as string) || null

  const { error } = await supabase
    .from('compromisos')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      tipo_pago,
      frecuencia: ((formData.get('frecuencia') as string) || null) as 'mensual' | 'quincenal' | 'semanal' | 'anual' | null,
      monto_mensualidad:
        parseFloat(formData.get('monto_mensualidad') as string) || null,
      fecha_proximo_pago: (formData.get('fecha_proximo_pago') as string) || null,
      prioridad: ((formData.get('prioridad') as string) || null) as 'alta' | 'media' | 'baja' | null,
      tarjeta_id: tarjetaId,
      mensualidades_restantes: formData.get('mensualidades_restantes')
        ? parseInt(formData.get('mensualidades_restantes') as string)
        : null,
      fecha_fin_estimada: (formData.get('fecha_fin_estimada') as string) || null,
      meses_totales: formData.get('meses_totales')
        ? parseInt(formData.get('meses_totales') as string)
        : null,
      saldo_real: formData.get('saldo_real')
        ? parseFloat(formData.get('saldo_real') as string)
        : null,
      pago_sin_intereses: formData.get('pago_sin_intereses')
        ? parseFloat(formData.get('pago_sin_intereses') as string)
        : null,
      pago_minimo: formData.get('pago_minimo')
        ? parseFloat(formData.get('pago_minimo') as string)
        : null,
      tasa_interes_anual: !isNaN(tasaAnual) && tasaAnual > 0 ? tasaAnual : null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export async function marcarPagado(
  id: string,
  montoPagado: number,
  cuentaId?: string | null
): Promise<MarcarPagadoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener fecha y nombre actuales del compromiso
  const { data: compromiso, error: fetchError } = await supabase
    .from('compromisos')
    .select('fecha_proximo_pago, nombre')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchError || !compromiso) return { error: 'Compromiso no encontrado' }

  const fechaAnterior = compromiso.fecha_proximo_pago

  // Calcular siguiente fecha de pago (+1 mes)
  let siguienteFecha: string | null = null
  if (fechaAnterior) {
    const d = new Date(fechaAnterior + 'T12:00:00')
    d.setMonth(d.getMonth() + 1)
    siguienteFecha = d.toISOString().split('T')[0]
  }

  const hoy = new Date().toISOString().split('T')[0]

  // Crear transacción de pago
  const { data: txData, error: txError } = await supabase
    .from('transacciones')
    .insert({
      usuario_id: user.id,
      compromiso_id: id,
      monto: montoPagado,
      tipo: 'gasto' as const,
      descripcion: `Pago: ${compromiso.nombre}`,
      fecha: hoy,
      cuenta_id: cuentaId ?? null,
    })
    .select('id')
    .single()

  if (txError) return { error: txError.message }

  // Descontar del saldo de la cuenta si se especificó
  if (cuentaId) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaId,
      p_monto: montoPagado,
    })
  }

  // Avanzar fecha_proximo_pago al mes siguiente
  const { error: updateError } = await supabase
    .from('compromisos')
    .update({ fecha_proximo_pago: siguienteFecha })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {
    transaccionId: txData.id,
    fechaAnterior,
    cuentaId: cuentaId ?? null,
    monto: montoPagado,
  }
}

export async function eliminarCompromiso(
  id: string,
  alcance: 'este_mes' | 'completo'
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (alcance === 'completo') {
    const { error } = await supabase
      .from('compromisos')
      .update({ activo: false })
      .eq('id', id)
      .eq('usuario_id', user.id)
    if (error) return { error: error.message }
  } else {
    // 'este_mes': avanzar fecha_proximo_pago un mes (saltar el cobro actual)
    const { data: compromiso, error: fetchErr } = await supabase
      .from('compromisos')
      .select('fecha_proximo_pago')
      .eq('id', id)
      .eq('usuario_id', user.id)
      .single()

    if (fetchErr || !compromiso) return { error: 'Compromiso no encontrado' }

    let siguienteFecha: string | null = null
    if (compromiso.fecha_proximo_pago) {
      const d = new Date(compromiso.fecha_proximo_pago + 'T12:00:00')
      d.setMonth(d.getMonth() + 1)
      siguienteFecha = d.toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('compromisos')
      .update({ fecha_proximo_pago: siguienteFecha })
      .eq('id', id)
      .eq('usuario_id', user.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export async function crearAcuerdoPago(
  compromisoId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const monto_acordado = parseFloat(formData.get('monto_acordado') as string)
  const fecha_acuerdo = (formData.get('fecha_acuerdo') as string) || new Date().toISOString().split('T')[0]
  const fecha_limite = formData.get('fecha_limite') as string
  const notas = (formData.get('notas') as string) || null

  if (isNaN(monto_acordado) || monto_acordado <= 0) return { error: 'Monto inválido' }
  if (!fecha_limite) return { error: 'La fecha límite es requerida' }

  const { error } = await supabase.from('acuerdos_pago').insert({
    usuario_id: user.id,
    compromiso_id: compromisoId,
    monto_acordado,
    fecha_acuerdo,
    fecha_limite,
    monto_abonado: 0,
    monto_pendiente: monto_acordado,
    estado: 'activo' as const,
    notas,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export type RegistrarAbonoResult = { error?: string }

export async function registrarAbono(
  acuerdoId: string,
  compromisoId: string,
  monto: number,
  cuentaId: string | null
): Promise<RegistrarAbonoResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const hoy = new Date().toISOString().split('T')[0]

  // Obtener nombre del compromiso para la descripción
  const { data: compromiso } = await supabase
    .from('compromisos')
    .select('nombre')
    .eq('id', compromisoId)
    .eq('usuario_id', user.id)
    .single()

  // Insertar transacción ligada al compromiso
  const { error: txError } = await supabase.from('transacciones').insert({
    usuario_id: user.id,
    compromiso_id: compromisoId,
    tipo: 'gasto' as const,
    monto,
    fecha: hoy,
    descripcion: `Abono acuerdo: ${compromiso?.nombre ?? ''}`,
    cuenta_id: cuentaId,
  })

  if (txError) return { error: txError.message }

  // Descontar saldo si se especificó cuenta
  if (cuentaId) {
    await supabase.rpc('decrementar_saldo', { p_cuenta_id: cuentaId, p_monto: monto })
  }

  // Actualizar monto_abonado y monto_pendiente en el acuerdo
  const { data: acuerdo } = await supabase
    .from('acuerdos_pago')
    .select('monto_acordado, monto_abonado')
    .eq('id', acuerdoId)
    .eq('usuario_id', user.id)
    .single()

  if (acuerdo) {
    const nuevoAbonado = Number(acuerdo.monto_abonado) + monto
    const nuevoPendiente = Math.max(0, Number(acuerdo.monto_acordado) - nuevoAbonado)
    const nuevoEstado = nuevoPendiente === 0 ? 'cumplido' : 'activo'

    await supabase
      .from('acuerdos_pago')
      .update({
        monto_abonado: nuevoAbonado,
        monto_pendiente: nuevoPendiente,
        estado: nuevoEstado as 'activo' | 'cumplido',
      })
      .eq('id', acuerdoId)
      .eq('usuario_id', user.id)
  }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export async function registrarPagoLinea(
  lineaId: string,
  montoPagado: number,
  tipoPago: 'minimo' | 'sin_intereses' | 'parcial' | 'total',
  cuentaOrigenId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const hoy = new Date().toISOString().split('T')[0]

  // 1. Insertar en pagos_linea
  const { error: insertError } = await supabase.from('pagos_linea').insert({
    linea_credito_id: lineaId,
    usuario_id: user.id,
    fecha: hoy,
    monto_pagado: montoPagado,
    tipo_pago: tipoPago,
    cuenta_origen_id: cuentaOrigenId,
  })
  if (insertError) return { error: insertError.message }

  // 2. Decrementar saldo_actual de la línea (atómico, evita TOCTOU)
  const { error: rpcError } = await supabase.rpc('decrementar_saldo_linea', {
    p_linea_id: lineaId,
    p_monto: montoPagado,
  })
  if (rpcError) return { error: rpcError.message }

  // 3. Descontar del saldo de la cuenta si se especificó
  if (cuentaOrigenId) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaOrigenId,
      p_monto: montoPagado,
    })
  }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}

export async function deshacerMarcarPagado(
  transaccionId: string,
  compromisoId: string,
  fechaAnterior: string | null,
  cuentaId: string | null,
  monto: number
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
    await supabase.rpc('incrementar_saldo', {
      p_cuenta_id: cuentaId,
      p_monto: monto,
    })
  }

  // 3. Restaurar fecha_proximo_pago anterior
  const { error: updateErr } = await supabase
    .from('compromisos')
    .update({ fecha_proximo_pago: fechaAnterior })
    .eq('id', compromisoId)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}
