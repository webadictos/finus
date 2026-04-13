'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export type PrevistoBasico = { id: string; nombre: string; monto_estimado: number }
export type RegistrarGastoResult = {
  error?: string
  previstosCoincidentes?: PrevistoBasico[]
  transaccionId?: string
}

export async function registrarGasto(formData: FormData): Promise<RegistrarGastoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const formaPago = formData.get('forma_pago') as string
  const cuentaId = (formData.get('cuenta_id') as string) || null
  const tarjetaId = (formData.get('tarjeta_id') as string) || null
  const mesesMsi = formData.get('meses_msi')
  const fecha = (formData.get('fecha') as string) || new Date().toISOString().split('T')[0]

  const monto = parseFloat(formData.get('monto') as string) || 0

  let etiquetas: string[] | null = null
  try {
    const raw = formData.get('etiquetas') as string
    if (raw) etiquetas = JSON.parse(raw)
  } catch { /* ignorar */ }

  const { data: nuevaTx, error } = await supabase
    .from('transacciones')
    .insert({
      usuario_id: user.id,
      tipo: 'gasto',
      monto,
      fecha,
      descripcion: ((formData.get('descripcion') as string) || '').trim() || null,
      categoria: (formData.get('categoria') as string) || null,
      forma_pago: formaPago || null,
      cuenta_id: ['efectivo', 'debito'].includes(formaPago) ? cuentaId : null,
      tarjeta_id: ['credito_revolvente', 'msi'].includes(formaPago) ? tarjetaId : null,
      meses_msi: formaPago === 'msi' && mesesMsi ? parseInt(mesesMsi as string) : null,
      notas: ((formData.get('notas') as string) || '').trim() || null,
      etiquetas: etiquetas && etiquetas.length > 0 ? etiquetas : null,
      es_recurrente: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Actualizar saldo de la cuenta si aplica
  const cuentaEfectiva = ['efectivo', 'debito'].includes(formaPago) ? cuentaId : null
  if (cuentaEfectiva) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaEfectiva,
      p_monto: monto,
    })
  }

  // Buscar gastos previstos activos no realizados para sugerir vinculación
  const { data: previstos } = await supabase
    .from('gastos_previstos')
    .select('id, nombre, monto_estimado')
    .eq('usuario_id', user.id)
    .eq('activo', true)
    .eq('realizado', false)

  revalidatePath('/gastos')
  revalidatePath('/')
  return {
    previstosCoincidentes: (previstos ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      monto_estimado: Number(p.monto_estimado ?? 0),
    })),
    transaccionId: nuevaTx?.id,
  }
}

export async function actualizarGasto(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener la transacción actual para calcular diferencias de saldo
  const { data: anterior, error: fetchErr } = await supabase
    .from('transacciones')
    .select('monto, cuenta_id, forma_pago')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !anterior) return { error: 'Gasto no encontrado' }

  const formaPagoNueva = formData.get('forma_pago') as string
  const montoNuevo = parseFloat(formData.get('monto') as string) || 0
  const cuentaIdNueva = ['efectivo', 'debito'].includes(formaPagoNueva)
    ? (formData.get('cuenta_id') as string) || null
    : null
  const tarjetaIdNueva = ['credito_revolvente', 'msi'].includes(formaPagoNueva)
    ? (formData.get('tarjeta_id') as string) || null
    : null
  const mesesMsi = formData.get('meses_msi')

  let etiquetasActualizar: string[] | null = null
  try {
    const raw = formData.get('etiquetas') as string
    if (raw) etiquetasActualizar = JSON.parse(raw)
  } catch { /* ignorar */ }

  // Actualizar la transacción
  const { error: updateErr } = await supabase
    .from('transacciones')
    .update({
      monto: montoNuevo,
      fecha: (formData.get('fecha') as string) || new Date().toISOString().split('T')[0],
      descripcion: ((formData.get('descripcion') as string) || '').trim() || null,
      categoria: (formData.get('categoria') as string) || null,
      forma_pago: formaPagoNueva || null,
      cuenta_id: cuentaIdNueva,
      tarjeta_id: tarjetaIdNueva,
      meses_msi: formaPagoNueva === 'msi' && mesesMsi ? parseInt(mesesMsi as string) : null,
      notas: ((formData.get('notas') as string) || '').trim() || null,
      etiquetas: etiquetasActualizar && etiquetasActualizar.length > 0 ? etiquetasActualizar : null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // Ajustar saldo: revertir descuento anterior → aplicar nuevo
  const eraEfectivo = ['efectivo', 'debito'].includes(anterior.forma_pago ?? '')
  const esEfectivo = ['efectivo', 'debito'].includes(formaPagoNueva)

  if (eraEfectivo && anterior.cuenta_id) {
    await supabase.rpc('incrementar_saldo', {
      p_cuenta_id: anterior.cuenta_id,
      p_monto: Number(anterior.monto ?? 0),
    })
  }
  if (esEfectivo && cuentaIdNueva) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaIdNueva,
      p_monto: montoNuevo,
    })
  }

  revalidatePath('/gastos')
  revalidatePath('/')
  return {}
}

export async function eliminarGasto(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener la transacción antes de eliminar
  const { data: tx, error: fetchErr } = await supabase
    .from('transacciones')
    .select('monto, cuenta_id, forma_pago')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !tx) return { error: 'Gasto no encontrado' }

  const { error: delErr } = await supabase
    .from('transacciones')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (delErr) return { error: delErr.message }

  // Revertir descuento de saldo si aplica
  const eraEfectivo = ['efectivo', 'debito'].includes(tx.forma_pago ?? '')
  if (eraEfectivo && tx.cuenta_id) {
    await supabase.rpc('incrementar_saldo', {
      p_cuenta_id: tx.cuenta_id,
      p_monto: Number(tx.monto ?? 0),
    })
  }

  revalidatePath('/gastos')
  revalidatePath('/')
  return {}
}
