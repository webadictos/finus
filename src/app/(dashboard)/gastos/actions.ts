'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function registrarGasto(formData: FormData): Promise<ActionResult> {
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

  const { error } = await supabase.from('transacciones').insert({
    usuario_id: user.id,
    tipo: 'gasto',
    monto: parseFloat(formData.get('monto') as string) || 0,
    fecha,
    descripcion: ((formData.get('descripcion') as string) || '').trim() || null,
    categoria: (formData.get('categoria') as string) || null,
    forma_pago: formaPago || null,
    cuenta_id: ['efectivo', 'debito'].includes(formaPago) ? cuentaId : null,
    tarjeta_id: ['credito_revolvente', 'msi'].includes(formaPago) ? tarjetaId : null,
    meses_msi: formaPago === 'msi' && mesesMsi ? parseInt(mesesMsi as string) : null,
    notas: ((formData.get('notas') as string) || '').trim() || null,
    es_recurrente: false,
  })

  if (error) return { error: error.message }

  // Actualizar saldo de la cuenta si aplica
  const cuentaEfectiva = ['efectivo', 'debito'].includes(formaPago) ? cuentaId : null
  if (cuentaEfectiva) {
    await supabase.rpc('decrementar_saldo', {
      p_cuenta_id: cuentaEfectiva,
      p_monto: parseFloat(formData.get('monto') as string) || 0,
    })
  }

  revalidatePath('/gastos')
  revalidatePath('/')
  return {}
}
