import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { TrendingUp } from 'lucide-react'
import IngresoCard from '@/components/ingresos/IngresoCard'
import IngresosPeriodFilter from '@/components/ingresos/IngresosPeriodFilter'
import NuevoIngresoButton from '@/components/ingresos/NuevoIngresoButton'
import type { Database } from '@/types/database'
import {
  filterIngresosByPeriod,
  getIngresoEffectiveDate,
  getIngresoPeriodMeta,
  getProjectedRecurringIngresos,
  normalizeIngresoPeriod,
} from '@/lib/ingresos'

type Ingreso = Database['public']['Tables']['ingresos']['Row']

interface Props {
  searchParams: Promise<{ period?: string }>
}

function compareIngresos(a: Ingreso, b: Ingreso): number {
  const fechaA = getIngresoEffectiveDate(a) ?? '9999-12-31'
  const fechaB = getIngresoEffectiveDate(b) ?? '9999-12-31'
  return fechaA.localeCompare(fechaB)
}

export default async function IngresosPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { period } = await searchParams
  const currentPeriod = normalizeIngresoPeriod(period)
  const periodMeta = getIngresoPeriodMeta(currentPeriod)

  const [{ data }, cuentasRes] = await Promise.all([
    supabase
      .from('ingresos')
      .select('*')
      .order('fecha_esperada', { ascending: true, nullsFirst: false }),
    supabase
      .from('cuentas')
      .select('*')
      .eq('activa', true)
      .neq('tipo', 'inversion')
      .order('nombre', { ascending: true }),
  ])

  const ingresos: Ingreso[] = data ?? []
  const cuentas = cuentasRes.data ?? []
  const ingresosConRecurrentes = [
    ...ingresos,
    ...getProjectedRecurringIngresos(ingresos, periodMeta.projectionHorizonDays),
  ].sort(compareIngresos)
  const ingresosFiltrados = filterIngresosByPeriod(ingresosConRecurrentes, currentPeriod).sort(
    compareIngresos
  )

  // Separar en confirmados y pendientes
  const confirmados = ingresosFiltrados.filter((i) => i.estado === 'confirmado')
  const pendientes = ingresosFiltrados.filter((i) => i.estado !== 'confirmado')

  // KPIs
  const totalConfirmado = confirmados
    .reduce((sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0), 0)

  const totalPendiente = pendientes
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0), 0)

  const totalEsperado = ingresosFiltrados
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Ingresos</h1>
          <p className="hidden md:block text-sm text-muted-foreground">
            Flujo de entradas esperadas y confirmadas
          </p>
        </div>
        <NuevoIngresoButton cuentas={cuentas} />
      </div>

      <IngresosPeriodFilter period={currentPeriod} />

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Confirmado {periodMeta.kpiScope}
          </p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">
            {formatMXN(totalConfirmado)}
          </p>
          <p className="text-xs text-muted-foreground">{confirmados.length} ingresos</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Pendiente {periodMeta.kpiScope}
          </p>
          <p className="text-lg font-bold tabular-nums">{formatMXN(totalPendiente)}</p>
          <p className="text-xs text-muted-foreground">{pendientes.length} esperados</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Esperado {periodMeta.kpiScope}
          </p>
          <p className="text-lg font-bold tabular-nums">{formatMXN(totalEsperado)}</p>
          <p className="text-xs text-muted-foreground">
            reales y proyectados dentro del periodo
          </p>
        </div>
      </div>

      {ingresos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <TrendingUp className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin ingresos registrados</p>
          <p className="text-xs text-muted-foreground">
            Agrega tus fuentes de ingreso para proyectar tu flujo de efectivo
          </p>
        </div>
      ) : ingresosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <TrendingUp className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin ingresos en este periodo</p>
          <p className="text-xs text-muted-foreground">
            No hay ingresos registrados para {periodMeta.emptyScope}
          </p>
        </div>
      ) : (
        <>
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pendientes {periodMeta.sectionScope} ({pendientes.length})
              </h2>
              {pendientes.map((i) => (
                <IngresoCard key={i.id} ingreso={i} cuentas={cuentas} />
              ))}
            </section>
          )}

          {/* Confirmados */}
          {confirmados.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Confirmados {periodMeta.sectionScope} ({confirmados.length})
              </h2>
              {confirmados.map((i) => (
                <IngresoCard key={i.id} ingreso={i} cuentas={cuentas} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
