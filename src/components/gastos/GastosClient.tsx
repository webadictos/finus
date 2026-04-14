'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, Receipt, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GastoCard from '@/components/gastos/GastoCard'
import RegistrarGastoForm from '@/components/gastos/RegistrarGastoForm'
import VincularPrevistoModal from '@/components/gastos/VincularPrevistoModal'
import { formatMXN } from '@/lib/format'
import {
  formatMonthKeyLabel,
  GASTO_PAYMENT_OPTIONS,
  GASTO_PERIOD_OPTIONS,
  getMonthRange,
  getPaymentLabel,
  isOtherPayment,
  shiftMonthKey,
  type GastoPaymentKey,
  type GastoPeriodKey,
} from '@/lib/gastos-filters'
import {
  formatISODateForLocale,
  getCurrentMonthKey,
  getTodayLocalISO,
  getYesterdayLocalISO,
  sortByISODateDesc,
} from '@/lib/local-date'
import type { TagItem } from '@/lib/tags'
import type { Database } from '@/types/database'
import type { PrevistoBasico } from '@/app/(dashboard)/gastos/actions'

type Transaccion = Database['public']['Tables']['transacciones']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

function groupByDate(txs: Transaccion[]): Map<string, Transaccion[]> {
  const map = new Map<string, Transaccion[]>()
  for (const tx of txs) {
    const key = tx.fecha.slice(0, 10)
    const arr = map.get(key) ?? []
    arr.push(tx)
    map.set(key, arr)
  }
  return map
}

function fechaLabel(fecha: string): string {
  const hoy = getTodayLocalISO()
  const ayer = getYesterdayLocalISO()
  if (fecha === hoy) return 'Hoy'
  if (fecha === ayer) return 'Ayer'
  return formatISODateForLocale(fecha, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ─── KPI helpers ─────────────────────────────────────────────────────────────

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito_revolvente: 'Crédito',
  msi: 'MSI',
  prestamo: 'Préstamo',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  transacciones: Transaccion[]
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
  period: GastoPeriodKey
  payment: GastoPaymentKey
  from: string
  to: string
  periodLabel: string
  etiquetasSugeridas?: TagItem[]
}

// ─── Componente ──────────────────────────────────────────────────────────────

type Sugerencia = { previstos: PrevistoBasico[]; transaccionId: string }

export default function GastosClient({
  transacciones,
  cuentas,
  tarjetas,
  period,
  payment,
  from,
  to,
  periodLabel,
  etiquetasSugeridas = [],
}: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null)
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleSave(data: { previstosCoincidentes?: PrevistoBasico[]; transaccionId?: string }) {
    if (data.previstosCoincidentes && data.previstosCoincidentes.length > 0 && data.transaccionId) {
      setSugerencia({ previstos: data.previstosCoincidentes, transaccionId: data.transaccionId })
    }
  }

  const currentMes = getCurrentMonthKey()
  const currentMonthRange = getMonthRange(currentMes)
  const selectedMonthKey = period === 'month' && from ? from.slice(0, 7) as `${number}-${number}` : currentMes
  const esMesActual = selectedMonthKey === currentMes

  function navigate(next: {
    period?: GastoPeriodKey
    payment?: GastoPaymentKey
    from?: string
    to?: string
  }) {
    const params = new URLSearchParams(searchParams.toString())
    const nextPeriod = next.period ?? period
    const nextPayment = next.payment ?? payment
    params.set('period', nextPeriod)
    params.set('payment', nextPayment)

    if (nextPeriod === 'custom') {
      if (next.from) params.set('from', next.from)
      if (next.to) params.set('to', next.to)
    } else if (nextPeriod === 'month' && next.from) {
      const monthKey = next.from.slice(0, 7) as `${number}-${number}`
      const monthRange = getMonthRange(monthKey)
      params.set('from', monthRange.start)
      params.set('to', monthRange.end)
    } else {
      params.delete('from')
      params.delete('to')
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  function aplicarRangoCustom() {
    if (!customFrom || !customTo || customFrom > customTo) return
    navigate({ period: 'custom', from: customFrom, to: customTo })
  }

  function moverMes(delta: number) {
    const nextMonth = shiftMonthKey(selectedMonthKey, delta)
    const range = getMonthRange(nextMonth)
    navigate({ period: 'month', from: range.start, to: range.end })
  }

  // Build tarjetas map for card display
  const tarjetasMap = new Map(tarjetas.map((t) => [t.id, t.nombre]))

  // KPIs
  const totalMes = transacciones.reduce((sum, t) => sum + Number(t.monto ?? 0), 0)
  const porFormaPago = transacciones.reduce<Record<string, number>>((acc, t) => {
    const fp = isOtherPayment(t.forma_pago) ? 'otro' : (t.forma_pago as string)
    acc[fp] = (acc[fp] ?? 0) + Number(t.monto ?? 0)
    return acc
  }, {})

  // Group by date (already ordered DESC by fecha)
  const grupos = groupByDate(transacciones)
  const fechas = Array.from(grupos.keys()).sort(sortByISODateDesc)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border bg-card px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Periodo
          </p>
          <div className="flex flex-wrap gap-2">
            {GASTO_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  if (option.key === 'month') {
                    navigate({
                      period: 'month',
                      from: currentMonthRange.start,
                      to: currentMonthRange.end,
                    })
                    return
                  }
                  navigate({ period: option.key })
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  period === option.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'month' && (
          <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2">
            <button
              type="button"
              onClick={() => moverMes(-1)}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="text-sm font-semibold capitalize">{formatMonthKeyLabel(selectedMonthKey)}</span>

            <button
              type="button"
              onClick={() => moverMes(1)}
              disabled={esMesActual}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {period === 'custom' && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gastos-from" className="text-xs text-muted-foreground">Desde</label>
              <input
                id="gastos-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gastos-to" className="text-xs text-muted-foreground">Hasta</label>
              <input
                id="gastos-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button className="self-end" variant="outline" onClick={aplicarRangoCustom}>
              Aplicar rango
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Forma de pago
          </p>
          <div className="flex flex-wrap gap-2">
            {GASTO_PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => navigate({ payment: option.key })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  payment === option.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total del período
          </p>
          <p className="text-2xl font-bold tabular-nums text-destructive">
            {formatMXN(totalMes)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {transacciones.length} {transacciones.length === 1 ? 'transacción' : 'transacciones'} · {periodLabel}
          </p>
        </div>

        {Object.entries(porFormaPago).length > 0 && (
          <div className="rounded-xl border bg-card px-5 py-4 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Por forma de pago
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(porFormaPago).map(([fp, monto]) => (
                <div key={fp} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {FORMA_PAGO_LABEL[fp] ?? getPaymentLabel(fp as GastoPaymentKey)}:
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMXN(monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Header con botón */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Transacciones
        </h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Registrar gasto
        </Button>
      </div>

      {/* Lista agrupada por fecha */}
      {transacciones.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <Receipt className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Sin gastos en este período</p>
          <p className="text-xs text-muted-foreground">
            No hay gastos registrados para {periodLabel.toLowerCase()}
          </p>
          {period !== 'all' && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setFormOpen(true)}>
              <Plus className="size-3.5" />
              Registrar primer gasto
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {fechas.map((fecha) => (
            <div key={fecha} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide capitalize">
                {fechaLabel(fecha)}
              </h3>
              <div className="flex flex-col gap-2">
                {(grupos.get(fecha) ?? []).map((t) => (
                  <GastoCard
                    key={t.id}
                    transaccion={t}
                    tarjetaNombre={t.tarjeta_id ? tarjetasMap.get(t.tarjeta_id) : null}
                    cuentas={cuentas}
                    tarjetas={tarjetas}
                    etiquetasSugeridas={etiquetasSugeridas}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RegistrarGastoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cuentas={cuentas}
        tarjetas={tarjetas}
        etiquetasSugeridas={etiquetasSugeridas}
        onSave={handleSave}
      />

      {sugerencia && (
        <VincularPrevistoModal
          open={!!sugerencia}
          onOpenChange={(open) => { if (!open) setSugerencia(null) }}
          transaccionId={sugerencia.transaccionId}
          previstos={sugerencia.previstos}
        />
      )}
    </div>
  )
}
