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

export async function crearLineaCredito(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const nombre = (formData.get('nombre') as string).trim()
  if (!nombre) return { error: 'El nombre es requerido' }

  const tipo = formData.get('tipo') as 'tarjeta_credito' | 'linea_digital' | 'bnpl' | 'departamental'
  const titular_tipo = (formData.get('titular_tipo') as string | null) || 'personal'
  const banco = (formData.get('banco') as string | null)?.trim() || null
  const titular_nombre = (formData.get('titular_nombre') as string | null)?.trim() || null
  const ultimos_4 = (formData.get('ultimos_4') as string | null)?.trim() || null

  const rawLimite = parseFloat(formData.get('limite_credito') as string)
  const rawCorte = parseFloat(formData.get('saldo_al_corte') as string)
  const rawPSI = parseFloat(formData.get('pago_sin_intereses') as string)
  const rawMin = parseFloat(formData.get('pago_minimo') as string)
  const rawDiaCorte = parseInt(formData.get('dia_corte') as string)
  const rawDiaLimite = parseInt(formData.get('dia_limite_pago') as string)
  const rawTasa = parseFloat(formData.get('tasa_interes_anual') as string)

  const limite_credito = isNaN(rawLimite) ? null : rawLimite
  const saldo_al_corte = isNaN(rawCorte) ? null : rawCorte
  const pago_sin_intereses = isNaN(rawPSI) ? null : rawPSI
  const pago_minimo = isNaN(rawMin) ? null : rawMin
  const dia_corte = isNaN(rawDiaCorte) ? null : rawDiaCorte
  const dia_limite_pago = isNaN(rawDiaLimite) ? null : rawDiaLimite
  const tasa_interes_anual = isNaN(rawTasa) ? null : rawTasa

  // Calcular fecha_proximo_pago desde dia_limite_pago
  let fecha_proximo_pago: string | null = null
  if (dia_limite_pago != null) {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() // 0-based
    const day = today.getDate()

    // Si el día límite ya pasó este mes, usar el mes siguiente
    const targetMonth = day >= dia_limite_pago ? month + 1 : month
    const target = new Date(year, targetMonth, dia_limite_pago)
    fecha_proximo_pago = target.toISOString().split('T')[0]
  }

  const { error } = await supabase.from('lineas_credito').insert({
    usuario_id: user.id,
    nombre,
    banco,
    tipo,
    titular_tipo: titular_tipo as 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero',
    titular_nombre,
    ultimos_4,
    limite_credito,
    saldo_actual: saldo_al_corte ?? 0,
    saldo_al_corte,
    pago_sin_intereses,
    pago_minimo,
    fecha_proximo_pago,
    dia_corte,
    dia_limite_pago,
    tasa_interes_anual,
    activa: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  return {}
}

export async function actualizarLineaCredito(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const nombre = (formData.get('nombre') as string).trim()
  if (!nombre) return { error: 'El nombre es requerido' }

  const tipo = formData.get('tipo') as 'tarjeta_credito' | 'linea_digital' | 'bnpl' | 'departamental'
  const titular_tipo = (formData.get('titular_tipo') as string | null) || 'personal'
  const banco = (formData.get('banco') as string | null)?.trim() || null
  const titular_nombre = (formData.get('titular_nombre') as string | null)?.trim() || null
  const ultimos_4 = (formData.get('ultimos_4') as string | null)?.trim() || null

  const rawLimite = parseFloat(formData.get('limite_credito') as string)
  const rawCorte = parseFloat(formData.get('saldo_al_corte') as string)
  const rawPSI = parseFloat(formData.get('pago_sin_intereses') as string)
  const rawMin = parseFloat(formData.get('pago_minimo') as string)
  const rawDiaCorte = parseInt(formData.get('dia_corte') as string)
  const rawDiaLimite = parseInt(formData.get('dia_limite_pago') as string)
  const rawTasa = parseFloat(formData.get('tasa_interes_anual') as string)

  const limite_credito = isNaN(rawLimite) ? null : rawLimite
  const saldo_al_corte = isNaN(rawCorte) ? null : rawCorte
  const pago_sin_intereses = isNaN(rawPSI) ? null : rawPSI
  const pago_minimo = isNaN(rawMin) ? null : rawMin
  const dia_corte = isNaN(rawDiaCorte) ? null : rawDiaCorte
  const dia_limite_pago = isNaN(rawDiaLimite) ? null : rawDiaLimite
  const tasa_interes_anual = isNaN(rawTasa) ? null : rawTasa

  let fecha_proximo_pago: string | null = null
  if (dia_limite_pago != null) {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const day = today.getDate()
    const targetMonth = day >= dia_limite_pago ? month + 1 : month
    const target = new Date(year, targetMonth, dia_limite_pago)
    fecha_proximo_pago = target.toISOString().split('T')[0]
  }

  const { error } = await supabase
    .from('lineas_credito')
    .update({
      nombre,
      banco,
      tipo,
      titular_tipo: titular_tipo as 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero',
      titular_nombre,
      ultimos_4,
      limite_credito,
      saldo_al_corte,
      saldo_actual: saldo_al_corte ?? 0,
      pago_sin_intereses,
      pago_minimo,
      fecha_proximo_pago,
      dia_corte,
      dia_limite_pago,
      tasa_interes_anual,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  return {}
}

export async function eliminarLineaCredito(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('lineas_credito')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/compromisos')
  return {}
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
  const fecha_compra = (formData.get('fecha_compra') as string | null) || null

  if (!nombre) return { error: 'El nombre es requerido' }
  if (isNaN(monto_original) || monto_original <= 0) return { error: 'El monto es requerido' }

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

    mensualidades_totales = isNaN(rawMeses) || rawMeses <= 0 ? null : rawMeses
    // Usar override del usuario si lo proporcionó; si no, calcular desde monto/meses
    if (!isNaN(rawMensualidad) && rawMensualidad > 0) {
      monto_mensualidad = rawMensualidad
    } else if (mensualidades_totales) {
      monto_mensualidad = monto_original / mensualidades_totales
    }
    mensualidades_restantes = mensualidades_totales

    saldo_pendiente =
      monto_mensualidad != null && mensualidades_totales != null
        ? monto_mensualidad * mensualidades_totales
        : monto_original

    if (tipo === 'msi') {
      tasa_efectiva_anual = 0
    } else {
      // disposicion_efectivo: tomar tasa de la línea / 12
      const { data: linea } = await supabase
        .from('lineas_credito')
        .select('tasa_interes_anual')
        .eq('id', lineaId)
        .single()
      const tasaAnual = linea?.tasa_interes_anual != null ? Number(linea.tasa_interes_anual) : 0
      tasa_efectiva_anual = tasaAnual / 12
    }
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
    fecha_compra,
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

export async function pagarDesdePrestamo(
  compromisoId: string,
  prestamista: string,
  montoPrestamo: number,
  fechaDevolucion: string
): Promise<MarcarPagadoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener compromiso original para avanzar fecha y crear transacción
  const { data: compromiso, error: fetchError } = await supabase
    .from('compromisos')
    .select('fecha_proximo_pago, nombre, monto_mensualidad')
    .eq('id', compromisoId)
    .eq('usuario_id', user.id)
    .single()

  if (fetchError || !compromiso) return { error: 'Compromiso no encontrado' }

  const fechaAnterior = compromiso.fecha_proximo_pago
  const montoPagado = Number(compromiso.monto_mensualidad ?? 0)

  // Calcular siguiente fecha de pago (+1 mes)
  let siguienteFecha: string | null = null
  if (fechaAnterior) {
    const d = new Date(fechaAnterior + 'T12:00:00')
    d.setMonth(d.getMonth() + 1)
    siguienteFecha = d.toISOString().split('T')[0]
  }

  const hoy = new Date().toISOString().split('T')[0]

  // 1. Crear transacción de pago del compromiso original
  const { data: txData, error: txError } = await supabase
    .from('transacciones')
    .insert({
      usuario_id: user.id,
      compromiso_id: compromisoId,
      monto: montoPagado,
      tipo: 'gasto' as const,
      descripcion: `Pago (préstamo de ${prestamista}): ${compromiso.nombre}`,
      fecha: hoy,
    })
    .select('id')
    .single()

  if (txError) return { error: txError.message }

  // 2. Avanzar fecha_proximo_pago
  const { error: updateError } = await supabase
    .from('compromisos')
    .update({ fecha_proximo_pago: siguienteFecha })
    .eq('id', compromisoId)
    .eq('usuario_id', user.id)

  if (updateError) return { error: updateError.message }

  // 3. Crear compromiso de devolución
  const { error: devoError } = await supabase.from('compromisos').insert({
    usuario_id: user.id,
    nombre: `Devolución a ${prestamista}`,
    tipo_pago: 'prestamo' as const,
    monto_mensualidad: montoPrestamo,
    fecha_proximo_pago: fechaDevolucion,
    mensualidades_restantes: 1,
    prioridad: 'alta' as const,
    activo: true,
  })

  if (devoError) return { error: devoError.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {
    transaccionId: txData.id,
    fechaAnterior,
    cuentaId: null,
    monto: montoPagado,
  }
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

// ─── Obtener liquidez ─────────────────────────────────────────────────────────

export async function registrarDisposicionEfectivo(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const lineaId = formData.get('linea_credito_id') as string
  const monto = parseFloat(formData.get('monto') as string)
  const rawMensualidades = parseInt(formData.get('mensualidades_totales') as string)
  const rawOverride = parseFloat(formData.get('monto_mensualidad') as string)
  const cuentaDestinoId = (formData.get('cuenta_destino_id') as string) || null
  const nombre = ((formData.get('nombre') as string) || '').trim() || 'Disposición de efectivo'

  if (!lineaId) return { error: 'Selecciona una línea de crédito' }
  if (isNaN(monto) || monto <= 0) return { error: 'Ingresa un monto válido' }

  const mensualidades_totales = isNaN(rawMensualidades) || rawMensualidades < 1 ? 1 : rawMensualidades

  // Obtener tasa de la línea (tasa_efectiva_anual = tasa_anual / 12)
  const { data: linea } = await supabase
    .from('lineas_credito')
    .select('tasa_interes_anual')
    .eq('id', lineaId)
    .single()
  const tasaAnual = linea?.tasa_interes_anual != null ? Number(linea.tasa_interes_anual) : 0
  const tasa_efectiva_anual = tasaAnual / 12

  const monto_mensualidad =
    !isNaN(rawOverride) && rawOverride > 0
      ? rawOverride
      : monto / mensualidades_totales
  const saldo_pendiente = monto_mensualidad * mensualidades_totales
  const hoy = new Date().toISOString().split('T')[0]

  // 1. INSERT cargos_linea
  const { error: cargoError } = await supabase.from('cargos_linea').insert({
    linea_credito_id: lineaId,
    usuario_id: user.id,
    nombre,
    tipo: 'disposicion_efectivo',
    monto_original: monto,
    monto_mensualidad,
    mensualidades_totales,
    mensualidades_restantes: mensualidades_totales,
    saldo_pendiente,
    tasa_efectiva_anual,
    fecha_compra: hoy,
    activo: true,
  })
  if (cargoError) return { error: cargoError.message }

  // 2. Incrementar saldo de cuenta destino
  if (cuentaDestinoId) {
    await supabase.rpc('incrementar_saldo', { p_cuenta_id: cuentaDestinoId, p_monto: monto })
  }

  // 3. INSERT transacciones
  await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'ingreso' as const,
    monto,
    fecha: hoy,
    descripcion: nombre,
    cuenta_id: cuentaDestinoId,
    forma_pago: 'disposicion_efectivo',
    es_recurrente: false,
  })

  revalidatePath('/')
  revalidatePath('/compromisos')
  return {}
}

export async function registrarPrestamoPersonal(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const prestamista = ((formData.get('prestamista') as string) || '').trim()
  const montoRecibido = parseFloat(formData.get('monto_recibido') as string)
  const rawDevolucion = parseFloat(formData.get('monto_devolucion') as string)
  const comoDevuelves = formData.get('como_devuelves') as 'unico' | 'varios'
  const cuentaDestinoId = (formData.get('cuenta_destino_id') as string) || null

  if (!prestamista) return { error: 'Indica quién te presta' }
  if (isNaN(montoRecibido) || montoRecibido <= 0) return { error: 'Ingresa un monto recibido válido' }
  const montoDevolucion = isNaN(rawDevolucion) || rawDevolucion <= 0 ? montoRecibido : rawDevolucion

  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]

  // 1. Incrementar saldo
  if (cuentaDestinoId) {
    await supabase.rpc('incrementar_saldo', { p_cuenta_id: cuentaDestinoId, p_monto: montoRecibido })
  }

  // 2. INSERT transacciones
  await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'ingreso' as const,
    monto: montoRecibido,
    fecha: hoyStr,
    descripcion: `Préstamo de ${prestamista}`,
    cuenta_id: cuentaDestinoId,
    forma_pago: 'prestamo',
    es_recurrente: false,
  })

  // 3. Crear compromiso(s) de devolución
  if (comoDevuelves === 'unico') {
    const fechaDevolucion = (formData.get('fecha_devolucion') as string) || null
    await supabase.from('compromisos').insert({
      usuario_id: user.id,
      nombre: `Devolución a ${prestamista}`,
      tipo_pago: 'prestamo' as const,
      monto_mensualidad: montoDevolucion,
      fecha_proximo_pago: fechaDevolucion,
      mensualidades_restantes: 1,
      prioridad: 'alta' as const,
      activo: true,
    })
  } else {
    const rawNumPagos = parseInt(formData.get('num_pagos') as string)
    const frecuencia = (formData.get('frecuencia') as 'semanal' | 'quincenal' | 'mensual') || 'mensual'
    const numPagos = isNaN(rawNumPagos) || rawNumPagos < 1 ? 1 : rawNumPagos
    const montoPorPago = montoDevolucion / numPagos

    // Calcular primera fecha según frecuencia
    const primerPago = new Date(hoy)
    if (frecuencia === 'semanal') {
      primerPago.setDate(primerPago.getDate() + 7)
    } else if (frecuencia === 'quincenal') {
      primerPago.setDate(primerPago.getDate() + 15)
    } else {
      primerPago.setMonth(primerPago.getMonth() + 1)
    }
    const fechaProximoPago = primerPago.toISOString().split('T')[0]

    await supabase.from('compromisos').insert({
      usuario_id: user.id,
      nombre: `Devolución a ${prestamista}`,
      tipo_pago: 'prestamo' as const,
      monto_mensualidad: montoPorPago,
      fecha_proximo_pago: fechaProximoPago,
      mensualidades_restantes: numPagos,
      meses_totales: numPagos,
      prioridad: 'alta' as const,
      activo: true,
    })
  }

  revalidatePath('/')
  revalidatePath('/compromisos')
  return {}
}

// ─── Préstamos dados ─────────────────────────────────────────────────────────

export async function registrarPrestamoDado(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const deudor = ((formData.get('deudor') as string) || '').trim()
  const montoPrestado = parseFloat(formData.get('monto_prestado') as string)
  const rawRecuperar = parseFloat(formData.get('monto_a_recuperar') as string)
  const fechaDevolucion = (formData.get('fecha_devolucion') as string) || null
  const cuentaOrigenId = (formData.get('cuenta_origen_id') as string) || null
  const notas = ((formData.get('notas') as string) || '').trim() || null

  if (!deudor) return { error: 'Indica el nombre del deudor' }
  if (isNaN(montoPrestado) || montoPrestado <= 0) return { error: 'Ingresa un monto válido' }
  const montoARecuperar = isNaN(rawRecuperar) || rawRecuperar <= 0 ? montoPrestado : rawRecuperar

  const hoy = new Date().toISOString().split('T')[0]

  // 1. INSERT prestamos_dados
  const { error: insertError } = await supabase.from('prestamos_dados').insert({
    usuario_id: user.id,
    deudor,
    monto_prestado: montoPrestado,
    monto_a_recuperar: montoARecuperar,
    fecha_prestamo: hoy,
    fecha_devolucion: fechaDevolucion,
    monto_recuperado: 0,
    estado: 'pendiente' as const,
    notas,
    cuenta_origen_id: cuentaOrigenId,
    activo: true,
  })
  if (insertError) return { error: insertError.message }

  // 2. Decrementar saldo de cuenta origen
  if (cuentaOrigenId) {
    await supabase.rpc('decrementar_saldo', { p_cuenta_id: cuentaOrigenId, p_monto: montoPrestado })
  }

  // 3. INSERT transacciones
  await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'gasto' as const,
    monto: montoPrestado,
    fecha: hoy,
    descripcion: `Préstamo a ${deudor}`,
    categoria: 'prestamo_dado',
    cuenta_id: cuentaOrigenId,
    es_recurrente: false,
  })

  revalidatePath('/compromisos')
  return {}
}

export async function registrarAbonoPrestamoDado(
  prestamoId: string,
  montoAbono: number,
  cuentaId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: prestamo, error: fetchError } = await supabase
    .from('prestamos_dados')
    .select('deudor, monto_a_recuperar, monto_recuperado')
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)
    .single()

  if (fetchError || !prestamo) return { error: 'Préstamo no encontrado' }

  const nuevoRecuperado = Number(prestamo.monto_recuperado) + montoAbono
  const totalRecuperar = Number(prestamo.monto_a_recuperar)
  const nuevoEstado: 'parcial' | 'recuperado' =
    nuevoRecuperado >= totalRecuperar ? 'recuperado' : 'parcial'

  // 1. UPDATE prestamos_dados
  const { error: updateError } = await supabase
    .from('prestamos_dados')
    .update({ monto_recuperado: nuevoRecuperado, estado: nuevoEstado })
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)

  if (updateError) return { error: updateError.message }

  const hoy = new Date().toISOString().split('T')[0]

  // 2. Incrementar saldo si se especificó cuenta
  if (cuentaId) {
    await supabase.rpc('incrementar_saldo', { p_cuenta_id: cuentaId, p_monto: montoAbono })
  }

  // 3. INSERT transacciones
  await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'ingreso' as const,
    monto: montoAbono,
    fecha: hoy,
    descripcion: `Abono de ${prestamo.deudor}`,
    cuenta_id: cuentaId,
    es_recurrente: false,
  })

  revalidatePath('/compromisos')
  return {}
}
