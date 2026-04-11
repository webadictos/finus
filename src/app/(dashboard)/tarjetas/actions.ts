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
  const diaCorte = parseInt(formData.get('dia_corte') as string)
  const diaLimitePago = parseInt(formData.get('dia_limite_pago') as string)
  const titularNombre = (formData.get('titular_nombre') as string)?.trim() || null
  const ultimos4 = (formData.get('ultimos_4') as string)?.trim() || null

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
    titular_nombre: titularNombre,
    ultimos_4: ultimos4,
    limite_credito: !isNaN(limiteCredito) && limiteCredito > 0 ? limiteCredito : 0,
    dia_corte: !isNaN(diaCorte) && diaCorte > 0 ? diaCorte : null,
    dia_limite_pago: !isNaN(diaLimitePago) && diaLimitePago > 0 ? diaLimitePago : null,
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
  const diaCorte = parseInt(formData.get('dia_corte') as string)
  const diaLimitePago = parseInt(formData.get('dia_limite_pago') as string)
  const titularNombre = (formData.get('titular_nombre') as string)?.trim() || null
  const ultimos4 = (formData.get('ultimos_4') as string)?.trim() || null

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
      titular_nombre: titularNombre,
      ultimos_4: ultimos4,
      limite_credito: !isNaN(limiteCredito) && limiteCredito > 0 ? limiteCredito : 0,
      dia_corte: !isNaN(diaCorte) && diaCorte > 0 ? diaCorte : null,
      dia_limite_pago: !isNaN(diaLimitePago) && diaLimitePago > 0 ? diaLimitePago : null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/tarjetas')
  revalidatePath('/compromisos')
  return {}
}
