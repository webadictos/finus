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
    <div className="rounded-xl border bg-card/70 px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <Wallet className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Disponible
          </p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {formatMXN(saldoTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            {cuentasLiquidas.length} cuenta(s)
            {ingresosSinCuenta > 0 ? ` + ingresos sin cuenta` : ''}
          </p>
        </div>
        {cuentasLiquidas.length > 0 && (
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {expanded && cuentasLiquidas.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          {cuentasLiquidas.map((cuenta) => (
            <div key={cuenta.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{cuenta.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  {TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatMXN(Number(cuenta.saldo_actual ?? 0))}
              </span>
            </div>
          ))}
          {ingresosSinCuenta > 0 && (
            <div className="flex items-center justify-between gap-3 border-t pt-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Ingresos sin cuenta</p>
                <p className="text-[11px] text-muted-foreground">Confirmados, fuera del saldo bancario</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMXN(ingresosSinCuenta)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
