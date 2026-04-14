'use server'

import { createClient } from '@/lib/supabase/server'
import { getTodayLocalISO } from '@/lib/local-date'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function crearGastoPrevisto(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const tipo = formData.get('tipo_programacion') as string
  const frecuenciaDias = formData.get('frecuencia_dias')
  const mes = formData.get('mes') as string

  const { error } = await supabase.from('gastos_previstos').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    monto_estimado: parseFloat(formData.get('monto_estimado') as string) || 0,
    tipo_programacion: tipo as 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual',
    certeza: (formData.get('certeza') as 'alta' | 'media' | 'baja') || 'media',
    frecuencia_dias:
      tipo === 'recurrente_aprox' && frecuenciaDias
        ? parseInt(frecuenciaDias as string)
        : null,
    mes: tipo === 'previsto_sin_fecha' && mes ? mes : null,
    activo: true,
    realizado: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/proyeccion')
  return {}
}

export async function actualizarGastoPrevisto(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const tipo = formData.get('tipo_programacion') as string
  const frecuenciaDias = formData.get('frecuencia_dias')
  const mes = formData.get('mes') as string

  const { error } = await supabase
    .from('gastos_previstos')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      monto_estimado: parseFloat(formData.get('monto_estimado') as string) || 0,
      tipo_programacion: tipo as 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual',
      certeza: (formData.get('certeza') as 'alta' | 'media' | 'baja') || 'media',
      frecuencia_dias:
        tipo === 'recurrente_aprox' && frecuenciaDias
          ? parseInt(frecuenciaDias as string)
          : null,
      mes: tipo === 'previsto_sin_fecha' && mes ? mes : null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/proyeccion')
  return {}
}

export async function confirmarGastoPrevisto(
  id: string,
  montoReal: number,
  cuentaId: string | null,
  formaPago: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: previsto, error: fetchErr } = await supabase
    .from('gastos_previstos')
    .select('nombre, monto_estimado')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !previsto) return { error: 'Gasto previsto no encontrado' }

  const hoy = getTodayLocalISO()
  const monto = montoReal > 0 ? montoReal : Number(previsto.monto_estimado ?? 0)
  const cuentaEfectiva =
    formaPago && ['efectivo', 'debito'].includes(formaPago) ? cuentaId : null

  const { data: tx, error: txErr } = await supabase
    .from('transacciones')
    .insert({
      usuario_id: user.id,
      tipo: 'gasto',
      monto,
      fecha: hoy,
      descripcion: previsto.nombre,
      cuenta_id: cuentaEfectiva,
      forma_pago: formaPago || null,
      es_recurrente: false,
    })
    .select('id')
    .single()

  if (txErr || !tx) return { error: txErr?.message ?? 'Error al crear transacción' }

  const { error: updateErr } = await supabase
    .from('gastos_previstos')
    .update({
      realizado: true,
      monto_real: montoReal > 0 ? montoReal : null,
      fecha_confirmada: hoy,
      transaccion_id: tx.id,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  if (cuentaEfectiva) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaEfectiva,
      p_monto: monto,
    })
  }

  revalidatePath('/proyeccion')
  revalidatePath('/gastos')
  revalidatePath('/')
  return {}
}

export async function vincularGastoPrevisto(
  previsto_id: string,
  transaccion_id: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const hoy = getTodayLocalISO()

  const { error } = await supabase
    .from('gastos_previstos')
    .update({
      realizado: true,
      transaccion_id,
      fecha_confirmada: hoy,
    })
    .eq('id', previsto_id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/proyeccion')
  revalidatePath('/gastos')
  revalidatePath('/')
  return {}
}

export async function confirmarFechaGasto(
  id: string,
  fechaConfirmada: string,
  montoReal?: number | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const updateData: { fecha_confirmada: string; monto_real?: number } = {
    fecha_confirmada: fechaConfirmada,
  }
  if (montoReal != null && montoReal > 0) {
    updateData.monto_real = montoReal
  }

  const { error } = await supabase
    .from('gastos_previstos')
    .update(updateData)
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/proyeccion')
  return {}
}
