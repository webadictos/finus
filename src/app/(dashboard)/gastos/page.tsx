import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GastosClient from '@/components/gastos/GastosClient'
import {
  getGastoPeriodMeta,
  isOtherPayment,
  normalizeCustomDateInput,
  normalizeGastoPayment,
  normalizeGastoPeriod,
  type GastoPaymentKey,
  type GastoPeriodKey,
} from '@/lib/gastos-filters'
import { parseTags, type TagItem } from '@/lib/tags'
import type { Database } from '@/types/database'

interface Props {
  searchParams: Promise<{
    period?: string
    payment?: string
    from?: string
    to?: string
  }>
}

export default async function GastosPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawParams = await searchParams
  const currentPeriod = normalizeGastoPeriod(rawParams.period)
  const currentPayment = normalizeGastoPayment(rawParams.payment)
  const customFrom = normalizeCustomDateInput(rawParams.from)
  const customTo = normalizeCustomDateInput(rawParams.to)
  const periodMeta = getGastoPeriodMeta(currentPeriod, customFrom, customTo)

  const transaccionesQuery = supabase
      .from('transacciones')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('tipo', 'gasto')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

  if (periodMeta.start) {
    transaccionesQuery.gte('fecha', periodMeta.start)
  }
  if (periodMeta.end) {
    transaccionesQuery.lte('fecha', periodMeta.end)
  }
  if (currentPayment !== 'all' && currentPayment !== 'otro') {
    transaccionesQuery.eq('forma_pago', currentPayment)
  }

  const [transRes, cuentasRes, tarjetasRes, etiquetasRes] = await Promise.all([
    transaccionesQuery,
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
  const { data: ingresosSinCuentaRes } = await supabase
    .from('ingresos')
    .select('monto_real, monto_esperado')
    .eq('usuario_id', user.id)
    .eq('estado', 'confirmado')
    .is('cuenta_destino_id', null)

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
  const transacciones = (transRes.data ?? []).filter((tx) => {
    if (currentPayment === 'all') return true
    if (currentPayment === 'otro') {
      return isOtherPayment(tx.forma_pago)
    }
    return tx.forma_pago === currentPayment
  })
  const ingresosSinCuenta = (ingresosSinCuentaRes ?? []).reduce(
    (sum, ingreso) => sum + Number(ingreso.monto_real ?? ingreso.monto_esperado ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-4 px-3 pb-4 pt-0 md:gap-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
        <p className="hidden md:block text-sm text-muted-foreground mt-0.5">
          Registro de gastos por período
        </p>
      </div>

      <GastosClient
        transacciones={transacciones}
        cuentas={cuentasRes.data ?? []}
        ingresosSinCuenta={ingresosSinCuenta}
        tarjetas={tarjetasRes.data ?? []}
        period={periodMeta.key as GastoPeriodKey}
        payment={currentPayment as GastoPaymentKey}
        from={customFrom}
        to={customTo}
        periodLabel={periodMeta.label}
        etiquetasSugeridas={etiquetasSugeridas}
      />
    </div>
  )
}
