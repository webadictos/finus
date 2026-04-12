import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import { getRecomendacion, getRecomendacionLinea } from '@/lib/recommendations'
import RecomendacionBadge from '@/components/compromisos/RecomendacionBadge'
import type { Database } from '@/types/database'
import type { CompromisoParaRecomendacion, LineaParaRecomendacion } from '@/types/finus'
import { AlertCircle } from 'lucide-react'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type CargoLinea = Database['public']['Tables']['cargos_linea']['Row']

interface Props {
  compromisos: Compromiso[]
  lineas: LineaCredito[]
  cargos: CargoLinea[]
  saldoDisponible: number
}

type ItemVencimiento =
  | { kind: 'compromiso'; data: Compromiso; dias: number }
  | { kind: 'linea'; data: LineaCredito; dias: number }

export default function AlertasVencimiento({ compromisos, lineas, cargos, saldoDisponible }: Props) {
  const hoy = new Date()
  const en7dias = new Date(hoy)
  en7dias.setDate(en7dias.getDate() + 7)

  const proximosCompromisos: ItemVencimiento[] = compromisos
    .filter((c) => {
      if (!c.activo || !c.fecha_proximo_pago) return false
      const fecha = new Date(c.fecha_proximo_pago)
      return fecha >= hoy && fecha <= en7dias
    })
    .map((c) => ({ kind: 'compromiso' as const, data: c, dias: diasHastaFecha(c.fecha_proximo_pago!) }))

  const proximasLineas: ItemVencimiento[] = lineas
    .filter((l) => {
      if (!l.activa || !l.fecha_proximo_pago) return false
      const fecha = new Date(l.fecha_proximo_pago)
      return fecha >= hoy && fecha <= en7dias
    })
    .map((l) => ({ kind: 'linea' as const, data: l, dias: diasHastaFecha(l.fecha_proximo_pago!) }))

  const proximos = [...proximosCompromisos, ...proximasLineas].sort((a, b) => a.dias - b.dias)

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
        {proximos.map((item) => {
          const { dias } = item
          const diasBadge = (
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
          )

          if (item.kind === 'compromiso') {
            const compromiso = item.data
            const input: CompromisoParaRecomendacion = {
              tipo_pago: compromiso.tipo_pago,
              saldo_real: compromiso.saldo_real != null ? Number(compromiso.saldo_real) : null,
              monto_mensualidad: compromiso.monto_mensualidad != null ? Number(compromiso.monto_mensualidad) : null,
              pago_minimo: compromiso.pago_minimo != null ? Number(compromiso.pago_minimo) : null,
              pago_sin_intereses: compromiso.pago_sin_intereses != null ? Number(compromiso.pago_sin_intereses) : null,
              mensualidades_restantes: compromiso.mensualidades_restantes,
              tasa_interes_anual: compromiso.tasa_interes_anual != null ? Number(compromiso.tasa_interes_anual) : null,
              fecha_proximo_pago: compromiso.fecha_proximo_pago,
              nombre: compromiso.nombre,
            }
            const rec = getRecomendacion(input, saldoDisponible)

            return (
              <div key={`c-${compromiso.id}`} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{compromiso.nombre}</span>
                    {diasBadge}
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatMXN(Number(compromiso.monto_mensualidad ?? compromiso.pago_minimo ?? 0))}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Vence {formatFecha(compromiso.fecha_proximo_pago!)}
                </div>
                <RecomendacionBadge recomendacion={rec} />
              </div>
            )
          }

          // Linea de crédito
          const linea = item.data
          const cargosLinea = cargos.filter((c) => c.linea_credito_id === linea.id)
          const lineaInput: LineaParaRecomendacion = {
            id: linea.id,
            nombre: linea.nombre,
            tipo: linea.tipo,
            saldo_al_corte: linea.saldo_al_corte != null ? Number(linea.saldo_al_corte) : null,
            pago_sin_intereses: linea.pago_sin_intereses != null ? Number(linea.pago_sin_intereses) : null,
            pago_minimo: linea.pago_minimo != null ? Number(linea.pago_minimo) : null,
            fecha_proximo_pago: linea.fecha_proximo_pago,
            tasa_interes_anual: linea.tasa_interes_anual != null ? Number(linea.tasa_interes_anual) : null,
            cargos: cargosLinea.map((c) => ({
              id: c.id,
              tipo: c.tipo,
              nombre: c.nombre,
              monto_mensualidad: c.monto_mensualidad != null ? Number(c.monto_mensualidad) : null,
              mensualidades_restantes: c.mensualidades_restantes,
              saldo_pendiente: Number(c.saldo_pendiente ?? 0),
              tasa_efectiva_anual: c.tasa_efectiva_anual != null ? Number(c.tasa_efectiva_anual) : null,
            })),
          }
          const rec = getRecomendacionLinea(lineaInput, saldoDisponible)

          return (
            <div key={`l-${linea.id}`} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{linea.nombre}</span>
                  {diasBadge}
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatMXN(Number(linea.pago_minimo ?? 0))}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Vence {formatFecha(linea.fecha_proximo_pago!)}
                {linea.pago_sin_intereses != null && (
                  <span className="ml-2">
                    · Sin intereses: {formatMXN(Number(linea.pago_sin_intereses))}
                  </span>
                )}
              </div>
              <RecomendacionBadge recomendacion={rec} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
