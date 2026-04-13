import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import { ConfirmarIngresoButton } from './ConfirmarIngresoButton'
import type { Database } from '@/types/database'
import { TrendingUp } from 'lucide-react'

type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  en_riesgo: {
    label: 'En riesgo',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  confirmado: {
    label: 'Confirmado',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  esperado: {
    label: 'Esperado',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
}

interface Props {
  ingresos: Ingreso[]
  cuentas: Cuenta[]
}

export default function ProximosIngresos({ ingresos, cuentas }: Props) {
  // Solo ingresos no confirmados con fecha próxima, o fijos recurrentes sin fecha
  const proximos = ingresos
    .filter((i) => i.estado !== 'confirmado')
    .sort((a, b) => {
      if (!a.fecha_esperada && !b.fecha_esperada) return 0
      if (!a.fecha_esperada) return 1
      if (!b.fecha_esperada) return -1
      return new Date(a.fecha_esperada).getTime() - new Date(b.fecha_esperada).getTime()
    })
    .slice(0, 5)

  if (proximos.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Próximos ingresos</h2>
        </div>
        <p className="text-sm text-muted-foreground">No hay ingresos pendientes registrados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-emerald-500" />
        <h2 className="text-sm font-semibold">Próximos ingresos</h2>
      </div>

      <div className="flex flex-col divide-y">
        {proximos.map((ingreso) => {
          const estadoInfo = ESTADO_LABEL[ingreso.estado] ?? ESTADO_LABEL.pendiente
          const dias = ingreso.fecha_esperada ? diasHastaFecha(ingreso.fecha_esperada) : null

          return (
            <div key={ingreso.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate">{ingreso.nombre}</span>
                <div className="flex items-center gap-2">
                  {ingreso.fecha_esperada ? (
                    <span className="text-xs text-muted-foreground">
                      {formatFecha(ingreso.fecha_esperada)}
                      {dias !== null && dias >= 0 && (
                        <span className="ml-1 text-muted-foreground/70">
                          ({dias === 0 ? 'hoy' : `en ${dias}d`})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin fecha definida</span>
                  )}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${estadoInfo.className}`}
                  >
                    {estadoInfo.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMXN(Number(ingreso.monto_esperado ?? 0))}
                </span>
                {ingreso.estado !== 'confirmado' && !ingreso.id.endsWith('_next') && (
                  <ConfirmarIngresoButton ingreso={ingreso} cuentas={cuentas} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t">
        <a href="/ingresos" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Ver todos los ingresos →
        </a>
      </div>
    </div>
  )
}
