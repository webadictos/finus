import { CalendarClock } from 'lucide-react'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'

type GastoPrevisto = Database['public']['Tables']['gastos_previstos']['Row']

interface Props {
  gastos: GastoPrevisto[]
}

export default function ProximosGastosPrevistos({ gastos }: Props) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const en7dias = new Date(hoy)
  en7dias.setDate(en7dias.getDate() + 7)

  const proximos = gastos
    .filter((g) => {
      const fechaRef = g.fecha_confirmada ?? g.fecha_sugerida
      if (!fechaRef) return false
      const d = new Date(fechaRef + 'T00:00:00')
      return d <= en7dias
    })
    .sort((a, b) => {
      const fa = a.fecha_confirmada ?? a.fecha_sugerida ?? ''
      const fb = b.fecha_confirmada ?? b.fecha_sugerida ?? ''
      return fa.localeCompare(fb)
    })

  if (proximos.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Gastos previstos próximos</h2>
        </div>
        <p className="text-sm text-muted-foreground">Sin gastos previstos en los próximos 7 días.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="size-4 text-orange-500" />
        <h2 className="text-sm font-semibold">
          Gastos previstos próximos{' '}
          <span className="ml-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-600">
            {proximos.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {proximos.map((gasto) => {
          const fechaRef = gasto.fecha_confirmada ?? gasto.fecha_sugerida
          const dias = fechaRef ? diasHastaFecha(fechaRef) : null
          const monto = Number(gasto.monto_real ?? gasto.monto_estimado ?? 0)

          return (
            <div key={gasto.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{gasto.nombre}</span>
                {dias !== null && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      dias <= 1
                        ? 'bg-destructive/10 text-destructive'
                        : dias <= 3
                        ? 'bg-orange-500/10 text-orange-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `${dias}d`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fechaRef && (
                  <span className="text-xs text-muted-foreground">{formatFecha(fechaRef)}</span>
                )}
                <span className="text-sm font-semibold tabular-nums text-destructive">
                  -{formatMXN(monto)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
