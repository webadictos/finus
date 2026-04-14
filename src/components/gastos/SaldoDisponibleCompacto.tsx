'use client'

import { useState } from 'react'
import { ChevronDown, Wallet } from 'lucide-react'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

const TIPO_LABEL: Record<string, string> = {
  banco: 'Banco',
  efectivo: 'Efectivo',
  digital: 'Digital',
}

interface Props {
  cuentas: Cuenta[]
  ingresosSinCuenta?: number
}

export default function SaldoDisponibleCompacto({
  cuentas,
  ingresosSinCuenta = 0,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const cuentasLiquidas = cuentas.filter((c) => c.activa && c.tipo !== 'inversion')
  const saldoCuentas = cuentasLiquidas.reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)
  const saldoTotal = saldoCuentas + ingresosSinCuenta

  return (
    <div className="rounded-xl border bg-card/70 px-3 py-2.5 md:px-4 md:py-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2.5 text-left md:gap-3"
      >
        <div className="rounded-full bg-muted p-1.5 text-muted-foreground md:p-2">
          <Wallet className="size-3.5 md:size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Disponible
          </p>
          <p className="text-base font-semibold tabular-nums text-foreground md:text-lg">
            {formatMXN(saldoTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground md:text-xs">
            {cuentasLiquidas.length} cuenta(s)
            {ingresosSinCuenta > 0 ? ` + ingresos sin cuenta` : ''}
          </p>
        </div>
        {cuentasLiquidas.length > 0 && (
          <ChevronDown
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 md:size-4 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {expanded && cuentasLiquidas.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-2 border-t pt-2.5 md:mt-3 md:pt-3">
          {cuentasLiquidas.map((cuenta) => (
            <div key={cuenta.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium md:text-sm">{cuenta.nombre}</p>
                <p className="text-[10px] text-muted-foreground md:text-[11px]">
                  {TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground md:text-sm">
                {formatMXN(Number(cuenta.saldo_actual ?? 0))}
              </span>
            </div>
          ))}
          {ingresosSinCuenta > 0 && (
            <div className="flex items-center justify-between gap-3 border-t pt-2">
              <div className="min-w-0">
                <p className="text-xs font-medium md:text-sm">Ingresos sin cuenta</p>
                <p className="text-[10px] text-muted-foreground md:text-[11px]">Confirmados, fuera del saldo bancario</p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 md:text-sm">
                {formatMXN(ingresosSinCuenta)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
