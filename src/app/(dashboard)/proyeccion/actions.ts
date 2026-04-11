'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function confirmarFechaGasto(
  id: string,
  fechaConfirmada: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('gastos_previstos')
    .update({ fecha_confirmada: fechaConfirmada })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/proyeccion')
  return {}
}
