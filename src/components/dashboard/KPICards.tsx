import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'
import { ArrowDown, ArrowUp, Calendar, Wallet } from 'lucide-react'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Compromiso = Database['public']['Tables']['compromisos']['Row']

interface Props {
  cuentas: Cuenta[]
  ingresos: Ingreso[]
  compromisos: Compromiso[]
}

function calcularPagoMinimo(c: Compromiso): number {
  switch (c.tipo_pago) {
    case 'revolvente':
      return Number(c.pago_minimo ?? 0)
    case 'msi':
      return Number(c.msi_mensualidad ?? 0)
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
}

function KPICard({ label, value, sublabel, icon, colorClass = 'text-foreground' }: KPICardProps) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={`text-xl font-bold leading-none ${colorClass}`}>{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  )
}

export default function KPICards({ cuentas, ingresos, compromisos }: Props) {
  const hoy = new Date()
  const en15dias = new Date(hoy)
  en15dias.setDate(en15dias.getDate() + 15)
  const en30dias = new Date(hoy)
  en30dias.setDate(en30dias.getDate() + 30)

  // 1. Disponible ahora (cuentas líquidas activas)
  const disponible = cuentas
    .filter((c) => c.activa && c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)

  // 2. Por recibir (ingresos pendientes próximos 30 días)
  const porRecibir = ingresos
    .filter((i) => {
      if (i.estado === 'confirmado') return false
      if (!i.fecha_esperada) return i.tipo === 'fijo_recurrente'
      const fecha = new Date(i.fecha_esperada)
      return fecha >= hoy && fecha <= en30dias
    })
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0), 0)

  // 3. Por pagar — suma de mínimos de compromisos activos
  const porPagar = compromisos
    .filter((c) => c.activo)
    .reduce((sum, c) => sum + calcularPagoMinimo(c), 0)

  // 4. Proyección 15 días = disponible + ingresos confirmados próx 15d - compromisos próx 15d
  const ingresosProx15 = ingresos
    .filter((i) => {
      if (i.estado === 'en_riesgo') return false
      if (!i.fecha_esperada) return false
      const fecha = new Date(i.fecha_esperada)
      return fecha >= hoy && fecha <= en15dias
    })
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0) * probFactor(i.probabilidad), 0)

  const compromisosProx15 = compromisos
    .filter((c) => {
      if (!c.activo) return false
      if (!c.fecha_proximo_pago) return false
      const fecha = new Date(c.fecha_proximo_pago)
      return fecha >= hoy && fecha <= en15dias
    })
    .reduce((sum, c) => sum + calcularPagoMinimo(c), 0)

  const proyeccion15 = disponible + ingresosProx15 - compromisosProx15

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KPICard
        label="Disponible ahora"
        value={formatMXN(disponible)}
        sublabel="Cuentas líquidas"
        icon={<Wallet className="size-4" />}
        colorClass={disponible >= 0 ? 'text-emerald-500' : 'text-destructive'}
      />
      <KPICard
        label="Por recibir"
        value={formatMXN(porRecibir)}
        sublabel="Próximos 30 días"
        icon={<ArrowDown className="size-4 text-emerald-500" />}
      />
      <KPICard
        label="Por pagar"
        value={formatMXN(porPagar)}
        sublabel="Pagos mínimos activos"
        icon={<ArrowUp className="size-4 text-destructive" />}
        colorClass="text-destructive"
      />
      <KPICard
        label="Proyección 15 días"
        value={formatMXN(proyeccion15)}
        sublabel="Ingresos prob. − compromisos"
        icon={<Calendar className="size-4" />}
        colorClass={proyeccion15 >= 0 ? 'text-emerald-500' : 'text-destructive'}
      />
    </div>
  )
}
