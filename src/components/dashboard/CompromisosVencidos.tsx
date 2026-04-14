'use client'

import { useState } from 'react'
import { formatMXN, formatFecha } from '@/lib/format'
import { diffCalendarDays, getTodayLocalISO } from '@/lib/local-date'
import { getRecomendacion } from '@/lib/recommendations'
import PagarModal from '@/components/compromisos/PagarModal'
import PagarLineaModal from '@/components/compromisos/PagarLineaModal'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database'
import type { CompromisoParaRecomendacion } from '@/types/finus'
import { AlertTriangle } from 'lucide-react'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  compromisos: Compromiso[]
  lineas: LineaCredito[]
  cuentas: Cuenta[]
  saldoDisponible: number
  reservaOperativa?: number
}

type ItemVencido =
  | { kind: 'compromiso'; data: Compromiso; diasAtrasado: number }
  | { kind: 'linea'; data: LineaCredito; diasAtrasado: number }

export default function CompromisosVencidos({
  compromisos,
  lineas,
  cuentas,
  saldoDisponible,
  reservaOperativa = 0,
}: Props) {
  const [pagarCompromisoId, setPagarCompromisoId] = useState<string | null>(null)
  const [pagarLineaId, setPagarLineaId] = useState<string | null>(null)

  const hoy = getTodayLocalISO()

  const compromisosVencidos: ItemVencido[] = compromisos
    .filter((c) => {
      if (!c.activo || !c.fecha_proximo_pago) return false
      return c.fecha_proximo_pago < hoy
    })
    .map((c) => {
      const diasAtrasado = Math.abs(diffCalendarDays(c.fecha_proximo_pago!, hoy))
      return { kind: 'compromiso' as const, data: c, diasAtrasado }
    })

  const lineasVencidas: ItemVencido[] = lineas
    .filter((l) => {
      if (!l.activa || !l.fecha_proximo_pago) return false
      return l.fecha_proximo_pago < hoy
    })
    .map((l) => {
      const diasAtrasado = Math.abs(diffCalendarDays(l.fecha_proximo_pago!, hoy))
      return { kind: 'linea' as const, data: l, diasAtrasado }
    })

  const vencidos = [...compromisosVencidos, ...lineasVencidas]
    .sort((a, b) => b.diasAtrasado - a.diasAtrasado)

  if (vencidos.length === 0) return null

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="size-4 text-destructive" />
        <h2 className="text-sm font-semibold text-destructive">
          Compromisos vencidos a hoy{' '}
          <span className="ml-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
            {vencidos.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {vencidos.map((item) => {
          if (item.kind === 'compromiso') {
            const c = item.data
            const input: CompromisoParaRecomendacion = {
              tipo_pago: c.tipo_pago,
              saldo_real: c.saldo_real != null ? Number(c.saldo_real) : null,
              monto_mensualidad: c.monto_mensualidad != null ? Number(c.monto_mensualidad) : null,
              pago_minimo: c.pago_minimo != null ? Number(c.pago_minimo) : null,
              pago_sin_intereses: c.pago_sin_intereses != null ? Number(c.pago_sin_intereses) : null,
              mensualidades_restantes: c.mensualidades_restantes,
              tasa_interes_anual: c.tasa_interes_anual != null ? Number(c.tasa_interes_anual) : null,
              fecha_proximo_pago: c.fecha_proximo_pago,
              nombre: c.nombre,
            }
            const rec = getRecomendacion(input, saldoDisponible, null, reservaOperativa)
            const montoPrincipal = Number(c.monto_mensualidad ?? c.pago_minimo ?? 0)

            return (
              <div key={`c-${c.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{c.nombre}</span>
                      <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                        {item.diasAtrasado}d atrasado
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Venció el {formatFecha(c.fecha_proximo_pago!)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold tabular-nums text-destructive">
                      {formatMXN(montoPrincipal)}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPagarCompromisoId(c.id)}
                    >
                      Pagar
                    </Button>
                  </div>
                </div>

                <PagarModal
                  open={pagarCompromisoId === c.id}
                  onOpenChange={(open) => { if (!open) setPagarCompromisoId(null) }}
                  compromisoId={c.id}
                  nombre={c.nombre}
                  montoPrincipal={montoPrincipal}
                  pagoSinIntereses={c.pago_sin_intereses != null ? Number(c.pago_sin_intereses) : null}
                  pagoMinimo={c.pago_minimo != null ? Number(c.pago_minimo) : null}
                  esRevolvente={c.tipo_pago === 'revolvente'}
                  recomendacion={rec}
                  cuentas={cuentas}
                />
              </div>
            )
          }

          const linea = item.data
          const montoPrincipal = Number(linea.pago_minimo ?? 0)

          return (
            <div key={`l-${linea.id}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{linea.nombre}</span>
                    <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                      {item.diasAtrasado}d atrasado
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Venció el {formatFecha(linea.fecha_proximo_pago!)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    {formatMXN(montoPrincipal)}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setPagarLineaId(linea.id)}
                  >
                    Pagar
                  </Button>
                </div>
              </div>

              <PagarLineaModal
                open={pagarLineaId === linea.id}
                onOpenChange={(open) => { if (!open) setPagarLineaId(null) }}
                lineaId={linea.id}
                nombre={linea.nombre}
                pagoMinimo={linea.pago_minimo != null ? Number(linea.pago_minimo) : null}
                pagoSinIntereses={linea.pago_sin_intereses != null ? Number(linea.pago_sin_intereses) : null}
                cuentas={cuentas}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-destructive/20">
        <a href="/compromisos" className="text-xs text-destructive hover:underline">
          Ver todos los compromisos →
        </a>
      </div>
    </div>
  )
}
