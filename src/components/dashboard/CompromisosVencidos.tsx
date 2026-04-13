'use client'

import { useState } from 'react'
import { formatMXN, formatFecha } from '@/lib/format'
import { getRecomendacion } from '@/lib/recommendations'
import PagarModal from '@/components/compromisos/PagarModal'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database'
import type { CompromisoParaRecomendacion } from '@/types/finus'
import { AlertTriangle } from 'lucide-react'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  compromisos: Compromiso[]
  cuentas: Cuenta[]
  saldoDisponible: number
}

export default function CompromisosVencidos({ compromisos, cuentas, saldoDisponible }: Props) {
  const [pagarOpen, setPagarOpen] = useState<string | null>(null)

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const vencidos = compromisos
    .filter((c) => {
      if (!c.activo || !c.fecha_proximo_pago) return false
      const fecha = new Date(c.fecha_proximo_pago + 'T00:00:00')
      return fecha < hoy
    })
    .map((c) => {
      const fecha = new Date(c.fecha_proximo_pago! + 'T00:00:00')
      const diasAtrasado = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
      return { compromiso: c, diasAtrasado }
    })
    .sort((a, b) => b.diasAtrasado - a.diasAtrasado)

  if (vencidos.length === 0) return null

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="size-4 text-destructive" />
        <h2 className="text-sm font-semibold text-destructive">
          Compromisos vencidos{' '}
          <span className="ml-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
            {vencidos.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {vencidos.map(({ compromiso: c, diasAtrasado }) => {
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
          const rec = getRecomendacion(input, saldoDisponible)
          const montoPrincipal = Number(c.monto_mensualidad ?? c.pago_minimo ?? 0)

          return (
            <div key={c.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{c.nombre}</span>
                    <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                      {diasAtrasado}d atrasado
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
                    onClick={() => setPagarOpen(c.id)}
                  >
                    Pagar
                  </Button>
                </div>
              </div>

              <PagarModal
                open={pagarOpen === c.id}
                onOpenChange={(open) => { if (!open) setPagarOpen(null) }}
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
