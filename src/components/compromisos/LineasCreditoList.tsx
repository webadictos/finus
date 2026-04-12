'use client'

import { CreditCard } from 'lucide-react'
import LineaCreditoCard from '@/components/compromisos/LineaCreditoCard'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type CargoLinea = Database['public']['Tables']['cargos_linea']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  lineas: LineaCredito[]
  cargos: CargoLinea[]
  cuentas: Cuenta[]
}

export default function LineasCreditoList({ lineas, cargos, cuentas }: Props) {
  if (lineas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <CreditCard className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Sin líneas de crédito registradas</p>
        <p className="text-xs text-muted-foreground">
          Las tarjetas de crédito y líneas digitales aparecerán aquí
        </p>
      </div>
    )
  }

  const totalMinimo = lineas.reduce(
    (sum, l) => sum + Number(l.pago_minimo ?? 0),
    0
  )
  const totalSinInt = lineas.reduce(
    (sum, l) => sum + Number(l.pago_sin_intereses ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total mínimo</p>
          <p className="text-lg font-bold tabular-nums text-destructive">
            {formatMXN(totalMinimo)}
          </p>
          <p className="text-xs text-muted-foreground">{lineas.length} línea{lineas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Sin intereses</p>
          <p className="text-lg font-bold tabular-nums">
            {formatMXN(totalSinInt)}
          </p>
          <p className="text-xs text-muted-foreground">pago recomendado</p>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="flex flex-col gap-3">
        {lineas.map((linea) => (
          <LineaCreditoCard
            key={linea.id}
            linea={linea}
            cargos={cargos.filter((c) => c.linea_credito_id === linea.id)}
            cuentas={cuentas}
          />
        ))}
      </div>
    </div>
  )
}
