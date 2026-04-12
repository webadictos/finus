'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function actualizarPerfil(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const nombre = (formData.get('nombre') as string)?.trim()
  if (!nombre) return { error: 'El nombre no puede estar vacío' }

  const { error } = await supabase
    .from('usuarios')
    .update({ nombre })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function cambiarPassword(nuevaPassword: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.auth.updateUser({ password: nuevaPassword })
  if (error) return { error: error.message }

  return {}
}

export async function resetearDatos(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const uid = user.id

  // Marcar activo=false en todas las entidades que lo soportan.
  // No se eliminan físicamente ni se tocan transacciones.
  const ops = await Promise.all([
    supabase.from('compromisos').update({ activo: false }).eq('usuario_id', uid).eq('activo', true),
    supabase.from('gastos_previstos').update({ activo: false }).eq('usuario_id', uid).eq('activo', true),
    supabase.from('tarjetas').update({ activa: false }).eq('usuario_id', uid).eq('activa', true),
    supabase.from('cuentas').update({ activa: false }).eq('usuario_id', uid).eq('activa', true),
    supabase.from('proyectos').update({ activo: false }).eq('usuario_id', uid).eq('activo', true),
    supabase.from('acuerdos_pago').update({ activo: false }).eq('usuario_id', uid).eq('activo', true),
  ])

  const firstError = ops.find((r) => r.error)
  if (firstError?.error) return { error: firstError.error.message }

  revalidatePath('/')
  revalidatePath('/compromisos')
  revalidatePath('/cuentas')
  revalidatePath('/tarjetas')
  return {}
}
