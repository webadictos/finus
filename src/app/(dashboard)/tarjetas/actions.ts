'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function crearTarjeta(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const limiteCredito = parseFloat(formData.get('limite_credito') as string)
  const fechaCorte = parseInt(formData.get('fecha_corte') as string)
  const fechaLimitePago = parseInt(formData.get('fecha_limite_pago') as string)

  const { error } = await supabase.from('tarjetas').insert({
    usuario_id: user.id,
    nombre: (formData.get('nombre') as string).trim(),
    banco: (formData.get('banco') as string).trim(),
    tipo: formData.get('tipo') as 'credito' | 'departamental',
    titular_tipo:
      ((formData.get('titular_tipo') as string) || 'personal') as
        | 'personal'
        | 'pareja'
        | 'familiar'
        | 'empresa'
        | 'tercero',
    limite_credito: !isNaN(limiteCredito) && limiteCredito > 0 ? limiteCredito : 0,
    fecha_corte: !isNaN(fechaCorte) && fechaCorte > 0 ? fechaCorte : null,
    fecha_limite_pago: !isNaN(fechaLimitePago) && fechaLimitePago > 0 ? fechaLimitePago : null,
    activa: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/tarjetas')
  revalidatePath('/compromisos')
  return {}
}

export async function actualizarTarjeta(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const limiteCredito = parseFloat(formData.get('limite_credito') as string)
  const fechaCorte = parseInt(formData.get('fecha_corte') as string)
  const fechaLimitePago = parseInt(formData.get('fecha_limite_pago') as string)

  const { error } = await supabase
    .from('tarjetas')
    .update({
      nombre: (formData.get('nombre') as string).trim(),
      banco: (formData.get('banco') as string).trim(),
      tipo: formData.get('tipo') as 'credito' | 'departamental',
      titular_tipo:
        ((formData.get('titular_tipo') as string) || 'personal') as
          | 'personal'
          | 'pareja'
          | 'familiar'
          | 'empresa'
          | 'tercero',
      limite_credito: !isNaN(limiteCredito) && limiteCredito > 0 ? limiteCredito : 0,
      fecha_corte: !isNaN(fechaCorte) && fechaCorte > 0 ? fechaCorte : null,
      fecha_limite_pago: !isNaN(fechaLimitePago) && fechaLimitePago > 0 ? fechaLimitePago : null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/tarjetas')
  revalidatePath('/compromisos')
  return {}
}
