'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmarIngresoAction(ingresoId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase
    .from('ingresos')
    .update({ estado: 'confirmado' as const })
    .eq('id', ingresoId)
    .eq('usuario_id', user.id)

  revalidatePath('/')
}
