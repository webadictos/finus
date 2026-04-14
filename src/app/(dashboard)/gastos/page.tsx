import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GastosClient from '@/components/gastos/GastosClient'
import { parseTags, type TagItem } from '@/lib/tags'
import type { Database } from '@/types/database'

interface Props {
  searchParams: Promise<{ mes?: string }>
}

export default async function GastosPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { mes } = await searchParams

  // Validar formato YYYY-MM o usar mes actual
  const now = new Date()
  const defaultMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const mesFinal = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : defaultMes

  const [year, month] = mesFinal.split('-').map(Number)
  const firstDay = `${mesFinal}-01`
  // Último día del mes: día 0 del mes siguiente
  const lastDayDate = new Date(year, month, 0)
  const lastDay = `${mesFinal}-${String(lastDayDate.getDate()).padStart(2, '0')}`

  const [transRes, cuentasRes, tarjetasRes, etiquetasRes] = await Promise.all([
    supabase
      .from('transacciones')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('tipo', 'gasto')
      .gte('fecha', firstDay)
      .lte('fecha', lastDay)
      .order('fecha', { ascending: false }),
    supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activa', true)
      .neq('tipo', 'inversion')
      .order('nombre', { ascending: true }),
    supabase
      .from('tarjetas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activa', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('transacciones')
      .select('etiquetas')
      .eq('usuario_id', user.id)
      .eq('tipo', 'gasto')
      .not('etiquetas', 'is', null),
  ])

  // Aplanar y deduplicar todas las etiquetas usadas
  const etiquetasMap = new Map<string, TagItem>()
  for (const tx of etiquetasRes.data ?? []) {
    for (const tag of parseTags((tx as { etiquetas: Database['public']['Tables']['transacciones']['Row']['etiquetas'] }).etiquetas)) {
      if (!etiquetasMap.has(tag.slug)) {
        etiquetasMap.set(tag.slug, tag)
      }
    }
  }
  const etiquetasSugeridas = Array.from(etiquetasMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es-MX')
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
        <p className="hidden md:block text-sm text-muted-foreground mt-0.5">
          Registro de gastos por período
        </p>
      </div>

      <GastosClient
        transacciones={transRes.data ?? []}
        cuentas={cuentasRes.data ?? []}
        tarjetas={tarjetasRes.data ?? []}
        mes={mesFinal}
        etiquetasSugeridas={etiquetasSugeridas}
      />
    </div>
  )
}
