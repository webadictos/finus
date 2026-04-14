'use client'

import { formatMXN } from '@/lib/format'
import { getDashboardPeriodMeta, isDateWithinDashboardPeriod, type DashboardPeriodKey } from '@/lib/dashboard-period'
import type { Database } from '@/types/database'
import { ArrowDown, ArrowUp, Calendar, CreditCard } from 'lucide-react'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Compromiso = Database['public']['Tables']['compromisos']['Row']
type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']

interface Props {
  cuentas: Cuenta[]
  ingresos: Ingreso[]
  compromisos: Compromiso[]
  lineas: LineaCredito[]
  reservaOperativa: number
  period: DashboardPeriodKey
}

function calcularPagoMinimo(c: Compromiso): number {
  switch (c.tipo_pago) {
    case 'revolvente':
      return Number(c.pago_minimo ?? 0)
    case 'msi':
      return Number(c.monto_mensualidad ?? 0)
    case 'prestamo':
    case 'fijo':
    case 'disposicion_efectivo':
      return Number(c.monto_mensualidad ?? 0)
    default:
      return 0
  }
}

function probFactor(p: string): number {
  const map: Record<string, number> = { alta: 0.9, media: 0.5, baja: 0.2 }
  return map[p] ?? 0.5
}

interface KPICardProps {
  label: string
  value: string
  sublabel?: string
  icon: React.ReactNode
  colorClass?: string
  onClick?: () => void
}

function KPICard({ label, value, sublabel, icon, colorClass = 'text-foreground', onClick }: KPICardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={`text-xl font-bold leading-none ${colorClass}`}>{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-2 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-2">
      {content}
    </div>
  )
}

export default function KPICards({
  cuentas,
  ingresos,
  compromisos,
  lineas,
  reservaOperativa,
  period,
}: Props) {
  const periodMeta = getDashboardPeriodMeta(period)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // Disponible ahora (para proyección)
  const ingresosSinCuenta = ingresos
    .filter((i) => i.estado === 'confirmado' && !i.cuenta_destino_id)
    .reduce((sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0), 0)

  const disponible =
    cuentas
      .filter((c) => c.activa && c.tipo !== 'inversion')
      .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0) + ingresosSinCuenta

  // 1. Por recibir (ingresos pendientes próximos 30 días)
  const porRecibir = ingresos
    .filter((i) => {
      if (i.estado === 'confirmado') return false
      if (!i.fecha_esperada) return false
      return isDateWithinDashboardPeriod(i.fecha_esperada, period)
    })
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0), 0)

  // 2. Por pagar — compromisos fijos + líneas de crédito con vencimiento próximo
  const porPagarVencidos = compromisos
    .filter((c) => {
      if (!c.activo || !c.fecha_proximo_pago) return false
      const fecha = new Date(`${c.fecha_proximo_pago}T00:00:00`)
      return fecha < hoy
    })
    .reduce((sum, c) => sum + calcularPagoMinimo(c), 0)

  const porPagarCompromisos = compromisos
    .filter((c) => c.activo && isDateWithinDashboardPeriod(c.fecha_proximo_pago, period))
    .reduce((sum, c) => sum + calcularPagoMinimo(c), 0)

  const lineasProx30 = lineas.filter((l) => {
    return isDateWithinDashboardPeriod(l.fecha_proximo_pago, period)
  })
  const porPagarLineas = lineasProx30.reduce((sum, l) => sum + Number(l.pago_minimo ?? 0), 0)
  const porPagar = porPagarVencidos + porPagarCompromisos + porPagarLineas

  // 3. Líneas de crédito — totales de pago sin intereses
  const totalPSI = lineasProx30.reduce((sum, l) => sum + Number(l.pago_sin_intereses ?? 0), 0)

  // 4. Proyección del periodo activo
  const ingresosPeriodo = ingresos
    .filter((i) => {
      if (i.estado === 'en_riesgo') return false
      if (!i.fecha_esperada) return false
      return isDateWithinDashboardPeriod(i.fecha_esperada, period)
    })
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0) * probFactor(i.probabilidad), 0)

  const compromisosPeriodo = compromisos
    .filter((c) => {
      if (!c.activo) return false
      return isDateWithinDashboardPeriod(c.fecha_proximo_pago, period)
    })
    .reduce((sum, c) => sum + calcularPagoMinimo(c), 0)

  const lineasPeriodo = lineas
    .filter((l) => isDateWithinDashboardPeriod(l.fecha_proximo_pago, period))
    .reduce((sum, l) => sum + Number(l.pago_minimo ?? 0), 0)

  const proyeccion = disponible + ingresosPeriodo - compromisosPeriodo - lineasPeriodo - reservaOperativa

  const scrollAProximosIngresos = () => {
    document.getElementById('proximos-ingresos')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <KPICard
        label="Por recibir"
        value={formatMXN(porRecibir)}
        sublabel={periodMeta.sublabel}
        icon={<ArrowDown className="size-4 text-emerald-500" />}
        onClick={scrollAProximosIngresos}
      />
      <KPICard
        label="Por pagar"
        value={formatMXN(porPagar)}
        sublabel={
          porPagarVencidos > 0
            ? `Incluye ${formatMXN(porPagarVencidos)} vencidos + ${periodMeta.sublabel.toLowerCase()}`
            : periodMeta.sublabel
        }
        icon={<ArrowUp className="size-4 text-destructive" />}
        colorClass="text-destructive"
      />
      <KPICard
        label="Líneas — sin intereses"
        value={formatMXN(totalPSI)}
        sublabel={period === 'month' ? 'Vence en el mes actual' : periodMeta.sublabel}
        icon={<CreditCard className="size-4 text-orange-500" />}
        colorClass="text-orange-500"
      />
      <KPICard
        label="Reserva operativa (7 días)"
        value={formatMXN(reservaOperativa)}
        sublabel="Cobertura de 7 días"
        icon={<Calendar className="size-4 text-sky-600" />}
        colorClass="text-sky-600"
      />
      <KPICard
        label={periodMeta.projectionLabel}
        value={formatMXN(proyeccion)}
        sublabel="Ingresos prob. − pagos − reserva"
        icon={<Calendar className="size-4" />}
        colorClass={proyeccion >= 0 ? 'text-emerald-500' : 'text-destructive'}
      />
    </div>
  )
}
