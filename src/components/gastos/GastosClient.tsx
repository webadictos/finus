'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GastoCard from '@/components/gastos/GastoCard'
import RegistrarGastoForm from '@/components/gastos/RegistrarGastoForm'
import VincularPrevistoModal from '@/components/gastos/VincularPrevistoModal'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'
import type { PrevistoBasico } from '@/app/(dashboard)/gastos/actions'

type Transaccion = Database['public']['Tables']['transacciones']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().split('T')[0]
}

function isoYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

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
  const hoy = isoToday()
  const ayer = isoYesterday()
  if (fecha === hoy) return 'Hoy'
  if (fecha === ayer) return 'Ayer'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** "YYYY-MM" → "Abril 2026" */
function mesLabel(mes: string): string {
  const [year, month] = mes.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  })
}

/** "YYYY-MM" → mes anterior "YYYY-MM" */
function mesPrevio(mes: string): string {
  const [year, month] = mes.split('-').map(Number)
  const d = new Date(year, month - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "YYYY-MM" → mes siguiente "YYYY-MM" */
function mesSiguiente(mes: string): string {
  const [year, month] = mes.split('-').map(Number)
  const d = new Date(year, month, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
  mes: string
}

// ─── Componente ──────────────────────────────────────────────────────────────

type Sugerencia = { previstos: PrevistoBasico[]; transaccionId: string }

export default function GastosClient({ transacciones, cuentas, tarjetas, mes }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null)
  const router = useRouter()

  function handleSave(data: { previstosCoincidentes?: PrevistoBasico[]; transaccionId?: string }) {
    if (data.previstosCoincidentes && data.previstosCoincidentes.length > 0 && data.transaccionId) {
      setSugerencia({ previstos: data.previstosCoincidentes, transaccionId: data.transaccionId })
    }
  }

  const now = new Date()
  const currentMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const esMesActual = mes === currentMes

  function navegar(destino: string) {
    router.push(`/gastos?mes=${destino}`)
  }

  // Build tarjetas map for card display
  const tarjetasMap = new Map(tarjetas.map((t) => [t.id, t.nombre]))

  // KPIs
  const totalMes = transacciones.reduce((sum, t) => sum + Number(t.monto ?? 0), 0)
  const porFormaPago = transacciones.reduce<Record<string, number>>((acc, t) => {
    const fp = t.forma_pago ?? 'otro'
    acc[fp] = (acc[fp] ?? 0) + Number(t.monto ?? 0)
    return acc
  }, {})

  // Group by date (already ordered DESC by fecha)
  const grupos = groupByDate(transacciones)
  const fechas = Array.from(grupos.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de período */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <button
          onClick={() => navegar(mesPrevio(mes))}
          className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-sm font-semibold capitalize">{mesLabel(mes)}</span>

        <button
          onClick={() => navegar(mesSiguiente(mes))}
          disabled={esMesActual}
          className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
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
            {transacciones.length} {transacciones.length === 1 ? 'transacción' : 'transacciones'}
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
                    {FORMA_PAGO_LABEL[fp] ?? fp}:
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
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          Registrar gasto
        </Button>
      </div>

      {/* Lista agrupada por fecha */}
      {transacciones.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <Receipt className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Sin gastos en este período</p>
          <p className="text-xs text-muted-foreground">
            No hay gastos registrados para {mesLabel(mes)}
          </p>
          {esMesActual && (
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
