import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import { getRecomendacion } from '@/lib/recommendations'
import RecomendacionBadge from '@/components/compromisos/RecomendacionBadge'
import type { Database } from '@/types/database'
import type { CompromisoParaRecomendacion } from '@/types/finus'
import { AlertCircle } from 'lucide-react'

type Compromiso = Database['public']['Tables']['compromisos']['Row']

interface Props {
  compromisos: Compromiso[]
  saldoDisponible: number
}

export default function AlertasVencimiento({ compromisos, saldoDisponible }: Props) {
  const hoy = new Date()
  const en7dias = new Date(hoy)
  en7dias.setDate(en7dias.getDate() + 7)

  const proximos = compromisos
    .filter((c) => {
      if (!c.activo || !c.fecha_proximo_pago) return false
      const fecha = new Date(c.fecha_proximo_pago)
      return fecha >= hoy && fecha <= en7dias
    })
    .sort((a, b) => {
      const da = diasHastaFecha(a.fecha_proximo_pago!)
      const db = diasHastaFecha(b.fecha_proximo_pago!)
      return da - db
    })

  if (proximos.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Próximos vencimientos</h2>
        </div>
        <p className="text-sm text-muted-foreground">Sin vencimientos en los próximos 7 días.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="size-4 text-orange-500" />
        <h2 className="text-sm font-semibold">
          Próximos vencimientos{' '}
          <span className="ml-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-600">
            {proximos.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {proximos.map((compromiso) => {
          const dias = diasHastaFecha(compromiso.fecha_proximo_pago!)
          const input: CompromisoParaRecomendacion = {
            tipo_pago: compromiso.tipo_pago,
            saldo_real: compromiso.saldo_real != null ? Number(compromiso.saldo_real) : null,
            monto_mensualidad: compromiso.monto_mensualidad != null ? Number(compromiso.monto_mensualidad) : null,
            pago_minimo: compromiso.pago_minimo != null ? Number(compromiso.pago_minimo) : null,
            pago_sin_intereses: compromiso.pago_sin_intereses != null ? Number(compromiso.pago_sin_intereses) : null,
            msi_mensualidades: compromiso.msi_mensualidades != null ? Number(compromiso.msi_mensualidades) : null,
            msi_mensualidad: compromiso.msi_mensualidad != null ? Number(compromiso.msi_mensualidad) : null,
            tasa_interes_mensual: compromiso.tasa_interes_mensual != null ? Number(compromiso.tasa_interes_mensual) : null,
            fecha_proximo_pago: compromiso.fecha_proximo_pago,
            nombre: compromiso.nombre,
          }
          const rec = getRecomendacion(input, saldoDisponible)

          return (
            <div key={compromiso.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{compromiso.nombre}</span>
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
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatMXN(Number(compromiso.monto_mensualidad ?? compromiso.pago_minimo ?? 0))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Vence {formatFecha(compromiso.fecha_proximo_pago!)}</span>
              </div>
              <RecomendacionBadge recomendacion={rec} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
