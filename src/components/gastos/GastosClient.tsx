'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, Receipt, ChevronLeft, ChevronRight, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GastoCard from '@/components/gastos/GastoCard'
import RegistrarGastoForm from '@/components/gastos/RegistrarGastoForm'
import SaldoDisponibleCompacto from '@/components/gastos/SaldoDisponibleCompacto'
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
  ingresosSinCuenta: number
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
type ToastData = {
  title: string
  cuentaLinea?: string | null
  globalLinea: string
}

export default function GastosClient({
  transacciones,
  cuentas,
  ingresosSinCuenta,
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
  const [toast, setToast] = useState<ToastData | null>(null)
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(period === 'custom')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  function handleSave(data: {
    previstosCoincidentes?: PrevistoBasico[]
    transaccionId?: string
    cuentaAfectada?: { id: string; nombre: string; saldoActualizado: number } | null
    saldoGlobalActualizado?: number | null
  }) {
    if (data.previstosCoincidentes && data.previstosCoincidentes.length > 0 && data.transaccionId) {
      setSugerencia({ previstos: data.previstosCoincidentes, transaccionId: data.transaccionId })
    }
    setToast({
      title: 'Gasto registrado',
      cuentaLinea: data.cuentaAfectada
        ? `${data.cuentaAfectada.nombre}: ${formatMXN(data.cuentaAfectada.saldoActualizado)}`
        : null,
      globalLinea: `Disponible global: ${formatMXN(data.saldoGlobalActualizado ?? 0)}`,
    })
    router.refresh()
  }

  const currentMes = getCurrentMonthKey()
  const currentMonthRange = getMonthRange(currentMes)
  const selectedMonthKey = period === 'month' && from ? from.slice(0, 7) as `${number}-${number}` : currentMes
  const esMesActual = selectedMonthKey === currentMes
  const isCustomActive = period === 'custom' || isCustomPickerOpen

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
    setIsCustomPickerOpen(true)
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
  const totalesPorFecha = new Map(
    fechas.map((fecha) => [
      fecha,
      (grupos.get(fecha) ?? []).reduce((sum, tx) => sum + Number(tx.monto ?? 0), 0),
    ])
  )

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 md:bottom-6 md:left-auto md:right-6 md:w-[22rem]">
          <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.cuentaLinea && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{toast.cuentaLinea}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">{toast.globalLinea}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Cerrar notificación"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <SaldoDisponibleCompacto cuentas={cuentas} ingresosSinCuenta={ingresosSinCuenta} />

      <div className="rounded-xl border bg-card px-3 py-3.5 md:px-4 md:py-4 flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Periodo
          </p>
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible md:pb-0">
            <div className="flex w-max gap-1.5 md:w-auto md:flex-wrap md:gap-2">
            {GASTO_PERIOD_OPTIONS.map((option) => (
              (() => {
                const isActive = option.key === 'custom'
                  ? isCustomActive
                  : period === option.key && !isCustomPickerOpen

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      if (option.key === 'month') {
                        setIsCustomPickerOpen(false)
                        navigate({
                          period: 'month',
                          from: currentMonthRange.start,
                          to: currentMonthRange.end,
                        })
                        return
                      }
                      if (option.key === 'custom') {
                        const fallbackDate = getTodayLocalISO()
                        const nextFrom = customFrom || from || fallbackDate
                        const nextTo = customTo || to || nextFrom
                        setCustomFrom(nextFrom)
                        setCustomTo(nextTo)
                        setIsCustomPickerOpen(true)
                        return
                      }
                      setIsCustomPickerOpen(false)
                      navigate({ period: option.key })
                    }}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium transition-colors md:px-3.5 md:py-1.5 md:text-sm ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })()
            ))}
            </div>
          </div>
        </div>

        {period === 'month' && !isCustomPickerOpen && (
          <div className="flex items-center justify-between rounded-xl border bg-background px-2.5 py-1.5 md:px-3 md:py-2">
            <button
              type="button"
              onClick={() => moverMes(-1)}
              className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:p-1.5"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="text-[13px] font-semibold capitalize md:text-sm">{formatMonthKeyLabel(selectedMonthKey)}</span>

            <button
              type="button"
              onClick={() => moverMes(1)}
              disabled={esMesActual}
              className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed md:p-1.5"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {isCustomActive && (
          <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto] md:gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="gastos-from" className="text-xs text-muted-foreground">Desde</label>
              <input
                id="gastos-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:px-3 md:text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="gastos-to" className="text-xs text-muted-foreground">Hasta</label>
              <input
                id="gastos-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:px-3 md:text-sm"
              />
            </div>
            <Button className="h-8 self-end px-3 text-xs md:h-9 md:px-4 md:text-sm" variant="outline" onClick={aplicarRangoCustom}>
              Aplicar rango
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-1.5 md:gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Forma de pago
          </p>
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible md:pb-0">
            <div className="flex w-max gap-1.5 md:w-auto md:flex-wrap md:gap-2">
            {GASTO_PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => navigate({ payment: option.key })}
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors md:px-3 md:py-1.5 md:text-sm ${
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border bg-card px-3.5 py-3 md:px-5 md:py-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:text-xs">
            Total del período
          </p>
          <p className="text-xl font-bold tabular-nums text-destructive md:text-2xl">
            {formatMXN(totalMes)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground md:text-xs">
            {transacciones.length} {transacciones.length === 1 ? 'transacción' : 'transacciones'} · {periodLabel}
          </p>
        </div>

        {Object.entries(porFormaPago).length > 0 && (
          <div className="rounded-xl border bg-card px-3.5 py-3 sm:col-span-2 md:px-5 md:py-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:mb-2 md:text-xs">
              Por forma de pago
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 md:gap-x-4">
              {Object.entries(porFormaPago).map(([fp, monto]) => (
                <div key={fp} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground md:text-xs">
                    {FORMA_PAGO_LABEL[fp] ?? getPaymentLabel(fp as GastoPaymentKey)}:
                  </span>
                  <span className="text-xs font-semibold tabular-nums md:text-sm">
                    {formatMXN(monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Header con botón */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Transacciones
        </h2>
        <Button className="h-9 px-3 md:h-10 md:px-4" onClick={() => setFormOpen(true)}>
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
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide capitalize">
                  {fechaLabel(fecha)}
                </h3>
                <p className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                  {formatMXN(totalesPorFecha.get(fecha) ?? 0)}
                </p>
              </div>
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
