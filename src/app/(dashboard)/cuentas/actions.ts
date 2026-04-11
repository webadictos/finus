'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function crearCuenta(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('cuentas').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    tipo: formData.get('tipo') as 'banco' | 'efectivo' | 'digital' | 'inversion',
    moneda: (formData.get('moneda') as string) || 'MXN',
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

  // NUNCA modificar saldo_actual con .update() — solo via RPC incrementar/decrementar_saldo
  const { error } = await supabase
    .from('cuentas')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      tipo: formData.get('tipo') as 'banco' | 'efectivo' | 'digital' | 'inversion',
      moneda: (formData.get('moneda') as string) || 'MXN',
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
