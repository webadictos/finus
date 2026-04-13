'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function crearPartida(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const monto = parseFloat(formData.get('monto_manual') as string) || 0

  const { error } = await supabase.from('presupuesto_operativo').insert({
    usuario_id: user.id,
    categoria: formData.get('categoria') as
      | 'comida'
      | 'gasolina'
      | 'despensa'
      | 'entretenimiento'
      | 'mascotas'
      | 'snacks'
      | 'transporte'
      | 'salud'
      | 'varios',
    subcategoria: ((formData.get('subcategoria') as string) || '').trim() || null,
    frecuencia: formData.get('frecuencia') as 'diario' | 'semanal' | 'quincenal' | 'mensual',
    monto_manual: monto,
    fuente_activa: 'manual',
    confianza: 'baja',
    semanas_de_datos: 0,
    sugerencia_pendiente: false,
    veces_ignorada: 0,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/presupuesto')
  return {}
}

export async function actualizarPartida(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const monto = parseFloat(formData.get('monto_manual') as string) || 0

  const { error } = await supabase
    .from('presupuesto_operativo')
    .update({
      categoria: formData.get('categoria') as
        | 'comida'
        | 'gasolina'
        | 'despensa'
        | 'entretenimiento'
        | 'mascotas'
        | 'snacks'
        | 'transporte'
        | 'salud'
        | 'varios',
      subcategoria: ((formData.get('subcategoria') as string) || '').trim() || null,
      frecuencia: formData.get('frecuencia') as 'diario' | 'semanal' | 'quincenal' | 'mensual',
      monto_manual: monto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/presupuesto')
  return {}
}

export async function eliminarPartida(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('presupuesto_operativo')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/presupuesto')
  return {}
}

export async function aceptarSugerencia(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Traer la partida para obtener monto_sugerido
  const { data: partida, error: fetchErr } = await supabase
    .from('presupuesto_operativo')
    .select('monto_sugerido, semanas_de_datos')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !partida) return { error: 'Partida no encontrada' }

  const confianza = (partida.semanas_de_datos ?? 0) >= 8 ? 'alta'
    : (partida.semanas_de_datos ?? 0) >= 4 ? 'media'
    : 'baja'

  const { error } = await supabase
    .from('presupuesto_operativo')
    .update({
      monto_aprendido: partida.monto_sugerido,
      fuente_activa: 'aprendido',
      confianza,
      sugerencia_pendiente: false,
      monto_sugerido: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/presupuesto')
  return {}
}

export async function ignorarSugerencia(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: partida, error: fetchErr } = await supabase
    .from('presupuesto_operativo')
    .select('veces_ignorada')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (fetchErr || !partida) return { error: 'Partida no encontrada' }

  const nuevasVeces = (partida.veces_ignorada ?? 0) + 1

  const { error } = await supabase
    .from('presupuesto_operativo')
    .update({
      sugerencia_pendiente: false,
      monto_sugerido: null,
      // Si llega a 3 veces ignorada, Finus deja de sugerir automáticamente
      veces_ignorada: nuevasVeces,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/presupuesto')
  return {}
}
