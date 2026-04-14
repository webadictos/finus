'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, TrendingUp, TrendingDown, ArrowDown, ArrowUp, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import GastoPrevistoCard from '@/components/proyeccion/GastoPrevistoCard'
import GastoPrevistoForm from '@/components/proyeccion/GastoPrevistoForm'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Compromiso = Database['public']['Tables']['compromisos']['Row']
type GastoPrevisto = Database['public']['Tables']['gastos_previstos']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

// ─── Constantes ───────────────────────────────────────────────────────────────

const HORIZONTES = [7, 15, 30, 45] as const
type Horizonte = (typeof HORIZONTES)[number]
type ProyeccionTab = 'resumen' | 'gastos'

const PROB_FACTOR: Record<string, number> = { alta: 0.9, media: 0.5, baja: 0.2 }
const CERTEZA_FACTOR: Record<string, number> = { alta: 1.0, media: 0.7, baja: 0.4 }
const PROB_PERCENT_LABEL: Record<string, string> = {
  alta: '90%',
  media: '50%',
  baja: '20%',
}

const TIPO_INGRESO_LABEL: Record<string, string> = {
  fijo_recurrente: 'Fijo',
  proyecto_recurrente: 'Proyecto',
  unico: 'Único',
}

const TIPO_PAGO_LABEL: Record<string, string> = {
  fijo: 'Fijo',
  revolvente: 'Revolvente',
  msi: 'MSI',
  prestamo: 'Préstamo',
  disposicion_efectivo: 'Efectivo',
}

const PROB_VARIANT: Record<string, BadgeVariant> = {
  alta: 'success',
  media: 'warning',
  baja: 'error',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fechaEnPeriodo(fecha: string | null, limitDate: Date): boolean {
  if (!fecha) return false
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T12:00:00')
  return f >= hoy && f <= limitDate
}

function fechaVencida(fecha: string | null): boolean {
  if (!fecha) return false
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T12:00:00')
  return f < hoy
}

function calcularLimite(dias: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  d.setHours(23, 59, 59, 999)
  return d
}

function getCompromisoMonto(c: Compromiso): number {
  switch (c.tipo_pago) {
    case 'revolvente':
      return Number(c.pago_minimo ?? c.pago_sin_intereses ?? 0)
    case 'msi':
      return Number(c.monto_mensualidad ?? c.pago_sin_intereses ?? c.pago_minimo ?? 0)
    case 'prestamo':
    case 'fijo':
    case 'disposicion_efectivo':
      return Number(c.monto_mensualidad ?? c.pago_minimo ?? 0)
    default:
      return Number(c.monto_mensualidad ?? c.pago_minimo ?? c.pago_sin_intereses ?? 0)
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  saldoActual: number
  cuentas: Cuenta[]
  ingresos: Ingreso[]
  compromisos: Compromiso[]
  gastosPrevistos: GastoPrevisto[]
  activeTab: ProyeccionTab
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ProyeccionClient({
  saldoActual,
  cuentas,
  ingresos,
  compromisos,
  gastosPrevistos,
  activeTab,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [horizonte, setHorizonte] = useState<Horizonte>(30)
  const [formOpen, setFormOpen] = useState(false)

  const limite = calcularLimite(horizonte)

  // Filtrar por horizonte
  const ingresosEnPeriodo = ingresos.filter((i) =>
    fechaEnPeriodo(i.fecha_esperada, limite)
  )
  const compromisosEnPeriodo = compromisos.filter((c) =>
    fechaEnPeriodo(c.fecha_proximo_pago, limite) || fechaVencida(c.fecha_proximo_pago)
  )
  const compromisosVencidos = compromisosEnPeriodo.filter((c) =>
    fechaVencida(c.fecha_proximo_pago)
  )
  const gastosEnPeriodo = gastosPrevistos.filter((g) => {
    if (g.realizado) return false
    const fecha = g.fecha_confirmada ?? g.fecha_sugerida
    if (fecha) return fechaEnPeriodo(fecha, limite)
    // Sin fecha: previsto_sin_fecha con mes actual entra siempre
    if (g.tipo_programacion === 'previsto_sin_fecha' && g.mes) {
      const hoy = new Date()
      const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
      return g.mes === mesActual
    }
    return false
  })

  // Cálculos ponderados
  const totalIngresos = ingresosEnPeriodo.reduce(
    (sum, i) => sum + Number(i.monto_esperado ?? 0) * (PROB_FACTOR[i.probabilidad] ?? 0.5),
    0
  )
  const totalCompromisos = compromisosEnPeriodo.reduce(
    (sum, c) => sum + getCompromisoMonto(c),
    0
  )
  const totalGastos = gastosEnPeriodo.reduce(
    (sum, g) => sum + Number(g.monto_estimado ?? 0) * (CERTEZA_FACTOR[g.certeza] ?? 0.7),
    0
  )
  const saldoProyectado = saldoActual + totalIngresos - totalCompromisos - totalGastos
  const positivo = saldoProyectado >= 0

  const handleTabChange = (nextTab: ProyeccionTab) => {
    if (nextTab === activeTab) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', nextTab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex border-b border-border -mb-2">
        {([
          { id: 'resumen', label: 'Resumen' },
          { id: 'gastos', label: 'Gastos previstos' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {id === 'gastos' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                  activeTab === id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {gastosPrevistos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' ? (
        <>
      {/* Selector de horizonte */}
      <div className="flex items-center gap-2">
        {HORIZONTES.map((h) => (
          <button
            key={h}
            onClick={() => setHorizonte(h)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              horizonte === h
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {h} días
          </button>
        ))}
      </div>

      {/* Tarjeta principal */}
      <div className="rounded-xl border bg-card px-6 py-5">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          Saldo proyectado en {horizonte} días
        </p>
        <div className="flex items-center gap-2 mb-3">
          {positivo ? (
            <TrendingUp className="size-6 text-emerald-500" />
          ) : (
            <TrendingDown className="size-6 text-destructive" />
          )}
          <span
            className={`text-4xl font-bold tracking-tight tabular-nums ${
              positivo ? 'text-emerald-500' : 'text-destructive'
            }`}
          >
            {formatMXN(saldoProyectado)}
          </span>
        </div>

        {/* Desglose */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Wallet className="size-3.5" />
            Hoy: <span className="font-medium text-foreground ml-0.5">{formatMXN(saldoActual)}</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-600">
            <ArrowDown className="size-3.5" />
            +{formatMXN(totalIngresos)}
          </span>
          <span className="flex items-center gap-1 text-destructive">
            <ArrowUp className="size-3.5" />
            −{formatMXN(totalCompromisos)}
          </span>
          {totalGastos > 0 && (
            <span className="flex items-center gap-1 text-orange-600">
              <ArrowUp className="size-3.5" />
              −{formatMXN(totalGastos)} gastos
            </span>
          )}
        </div>
      </div>

      {/* Desglose en dos columnas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Ingresos esperados */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ingresos esperados ({ingresosEnPeriodo.length})
          </h2>
          {ingresosEnPeriodo.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Sin ingresos en este período
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ingresosEnPeriodo.map((i) => {
                const monto = Number(i.monto_esperado ?? 0)
                const factor = PROB_FACTOR[i.probabilidad] ?? 0.5
                const dias = i.fecha_esperada ? diasHastaFecha(i.fecha_esperada) : null
                return (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{i.nombre}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px]">
                          {TIPO_INGRESO_LABEL[i.tipo] ?? i.tipo}
                        </Badge>
                        <Badge variant={PROB_VARIANT[i.probabilidad] ?? 'default'} className="text-[10px]">
                          {i.probabilidad}
                        </Badge>
                        {i.fecha_esperada && (
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(i.fecha_esperada)}
                            {dias !== null && <span className="ml-1">({dias}d)</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-emerald-600">
                        {formatMXN(monto * factor)}
                      </span>
                      {factor < 1 && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-medium text-emerald-600/80">
                            Ajustado por probabilidad ({PROB_PERCENT_LABEL[i.probabilidad] ?? `${Math.round(factor * 100)}%`})
                          </span>
                          <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                            Nominal: {formatMXN(monto)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Compromisos pendientes */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Compromisos pendientes ({compromisosEnPeriodo.length})
          </h2>
          {compromisosVencidos.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Incluye {compromisosVencidos.length} vencido{compromisosVencidos.length === 1 ? '' : 's'} o en mora
            </p>
          )}
          {compromisosEnPeriodo.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Sin compromisos en este período
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {compromisosEnPeriodo.map((c) => {
                const monto = getCompromisoMonto(c)
                const dias = c.fecha_proximo_pago
                  ? diasHastaFecha(c.fecha_proximo_pago)
                  : null
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{c.nombre}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px]">
                          {TIPO_PAGO_LABEL[c.tipo_pago] ?? c.tipo_pago}
                        </Badge>
                        {fechaVencida(c.fecha_proximo_pago) && (
                          <Badge variant="error" className="text-[10px]">
                            Vencido
                          </Badge>
                        )}
                        {c.fecha_proximo_pago && (
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(c.fecha_proximo_pago)}
                            {dias !== null && <span className="ml-1">({dias}d)</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-destructive shrink-0">
                      {formatMXN(monto)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
        </>
      ) : (
        /* Gastos previstos */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Gastos previstos ({gastosPrevistos.length})
            </h2>
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="size-3.5" />
              Nuevo gasto previsto
            </Button>
          </div>

          {gastosPrevistos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
              <p className="text-sm font-medium">Sin gastos previstos</p>
              <p className="text-xs text-muted-foreground">
                Agrega gastos que sabes que van a ocurrir aunque no tengan fecha exacta
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {gastosPrevistos.map((g) => (
                <GastoPrevistoCard key={g.id} gasto={g} cuentas={cuentas} />
              ))}
            </div>
          )}
        </div>
      )}

      <GastoPrevistoForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
