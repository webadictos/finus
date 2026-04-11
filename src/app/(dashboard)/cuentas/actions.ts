'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function transferirEntreCuentas(
  cuentaOrigenId: string,
  cuentaDestinoId: string,
  monto: number,
  fecha: string,
  notas?: string
): Promise<ActionResult> {
  if (cuentaOrigenId === cuentaDestinoId)
    return { error: 'La cuenta origen y destino no pueden ser la misma' }
  if (monto <= 0) return { error: 'El monto debe ser mayor a cero' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que ambas cuentas pertenecen al usuario
  const { data: cuentas } = await supabase
    .from('cuentas')
    .select('id, nombre')
    .eq('activa', true)
    .eq('usuario_id', user.id)
    .in('id', [cuentaOrigenId, cuentaDestinoId])

  if (!cuentas || cuentas.length !== 2)
    return { error: 'Una o ambas cuentas no existen o no te pertenecen' }

  const nombreOrigen = cuentas.find((c) => c.id === cuentaOrigenId)?.nombre ?? cuentaOrigenId
  const nombreDestino = cuentas.find((c) => c.id === cuentaDestinoId)?.nombre ?? cuentaDestinoId

  // Decrementar origen → incrementar destino (en ese orden para evitar saldo negativo intermedio)
  const { error: errDec } = await supabase.rpc('decrementar_saldo', {
    p_cuenta_id: cuentaOrigenId,
    p_monto: monto,
  })
  if (errDec) return { error: errDec.message }

  const { error: errInc } = await supabase.rpc('incrementar_saldo', {
    p_cuenta_id: cuentaDestinoId,
    p_monto: monto,
  })
  if (errInc) return { error: errInc.message }

  const notaFinal = [
    `Transferencia a: ${nombreDestino}`,
    notas?.trim() ? notas.trim() : null,
  ]
    .filter(Boolean)
    .join(' — ')

  const { error: errTx } = await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'transferencia',
    monto,
    fecha,
    descripcion: `Transferencia de ${nombreOrigen} a ${nombreDestino}`,
    cuenta_id: cuentaOrigenId,
    notas: notaFinal,
    es_recurrente: false,
  })
  if (errTx) return { error: errTx.message }

  revalidatePath('/cuentas')
  revalidatePath('/')
  return {}
}

export async function crearCuenta(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const tieneTarjeta = formData.get('tiene_tarjeta_debito') === 'true'
  const ultimos4 = (formData.get('ultimos_4_debito') as string)?.trim() || null

  const { error } = await supabase.from('cuentas').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    tipo: formData.get('tipo') as 'banco' | 'efectivo' | 'digital' | 'inversion',
    moneda: (formData.get('moneda') as string)?.trim() || 'MXN',
    tiene_tarjeta_debito: tieneTarjeta,
    ultimos_4_debito: tieneTarjeta ? ultimos4 : null,
    color: (formData.get('color') as string)?.trim() || null,
    icono: (formData.get('icono') as string)?.trim() || null,
    activa: true,
    // saldo_actual omitido — tiene DEFAULT 0 en BD
  })

  if (error) return { error: error.message }

  revalidatePath('/cuentas')
  revalidatePath('/')
  return {}
}

export async function actualizarCuenta(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const tieneTarjeta = formData.get('tiene_tarjeta_debito') === 'true'
  const ultimos4 = (formData.get('ultimos_4_debito') as string)?.trim() || null

  // NUNCA modificar saldo_actual con .update() — solo via RPC incrementar/decrementar_saldo
  const { error } = await supabase
    .from('cuentas')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      tipo: formData.get('tipo') as 'banco' | 'efectivo' | 'digital' | 'inversion',
      moneda: (formData.get('moneda') as string)?.trim() || 'MXN',
      tiene_tarjeta_debito: tieneTarjeta,
      ultimos_4_debito: tieneTarjeta ? ultimos4 : null,
      color: (formData.get('color') as string)?.trim() || null,
      icono: (formData.get('icono') as string)?.trim() || null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/cuentas')
  revalidatePath('/')
  return {}
}

export async function ajustarSaldo(
  cuentaId: string,
  saldoNuevo: number
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('saldo_actual')
    .eq('id', cuentaId)
    .eq('usuario_id', user.id)
    .single()

  if (!cuenta) return { error: 'Cuenta no encontrada' }

  const saldoActual = Number(cuenta.saldo_actual ?? 0)
  const delta = saldoNuevo - saldoActual

  if (delta === 0) return {}

  if (delta > 0) {
    const { error } = await supabase.rpc('incrementar_saldo', {
      p_cuenta_id: cuentaId,
      p_monto: delta,
    })
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaId,
      p_monto: Math.abs(delta),
    })
    if (error) return { error: error.message }
  }

  // TODO: registrar transacción tipo 'ajuste' cuando exista el enum en BD
  // ALTER TYPE transacciones_tipo ADD VALUE 'ajuste';

  revalidatePath('/cuentas')
  revalidatePath('/')
  return {}
}

export async function eliminarCuenta(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Validar que el saldo sea cero antes de eliminar
  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('saldo_actual')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (!cuenta) return { error: 'Cuenta no encontrada' }
  if (Number(cuenta.saldo_actual ?? 0) !== 0)
    return { error: 'No puedes eliminar una cuenta con saldo. Transfiere el saldo primero.' }

  const { error } = await supabase
    .from('cuentas')
    .update({ activa: false })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/cuentas')
  revalidatePath('/')
  return {}
}
