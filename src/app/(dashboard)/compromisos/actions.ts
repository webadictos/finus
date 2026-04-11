'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TipoPago } from '@/types/finus'

export type ActionResult = { error?: string }

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
    monto_mensualidad:
      parseFloat(formData.get('monto_mensualidad') as string) || null,
    fecha_proximo_pago: (formData.get('fecha_proximo_pago') as string) || null,
    prioridad: ((formData.get('prioridad') as string) || null) as 'alta' | 'media' | 'baja' | null,
    tarjeta_id: tarjetaId,
    msi_mensualidades: formData.get('msi_mensualidades')
      ? parseInt(formData.get('msi_mensualidades') as string)
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
    tasa_interes_mensual: !isNaN(tasaAnual) && tasaAnual > 0 ? tasaAnual / 12 : null,
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
      monto_mensualidad:
        parseFloat(formData.get('monto_mensualidad') as string) || null,
      fecha_proximo_pago: (formData.get('fecha_proximo_pago') as string) || null,
      prioridad: ((formData.get('prioridad') as string) || null) as 'alta' | 'media' | 'baja' | null,
      tarjeta_id: tarjetaId,
      msi_mensualidades: formData.get('msi_mensualidades')
        ? parseInt(formData.get('msi_mensualidades') as string)
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
      tasa_interes_mensual: !isNaN(tasaAnual) && tasaAnual > 0 ? tasaAnual / 12 : null,
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
  montoPagado: number
): Promise<ActionResult> {
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

  // Calcular siguiente fecha de pago (+1 mes)
  let siguienteFecha: string | null = null
  if (compromiso.fecha_proximo_pago) {
    const d = new Date(compromiso.fecha_proximo_pago + 'T12:00:00')
    d.setMonth(d.getMonth() + 1)
    siguienteFecha = d.toISOString().split('T')[0]
  }

  const hoy = new Date().toISOString().split('T')[0]

  // Crear transacción de pago
  const { error: txError } = await supabase.from('transacciones').insert({
    usuario_id: user.id,
    compromiso_id: id,
    monto: montoPagado,
    tipo: 'gasto' as const,
    descripcion: `Pago: ${compromiso.nombre}`,
    fecha: hoy,
  })

  if (txError) return { error: txError.message }

  // Avanzar fecha_proximo_pago al mes siguiente
  const { error: updateError } = await supabase
    .from('compromisos')
    .update({ fecha_proximo_pago: siguienteFecha })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/compromisos')
  revalidatePath('/')
  return {}
}
