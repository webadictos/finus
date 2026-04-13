'use client'

import { useState } from 'react'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

const TIPO_LABEL: Record<string, string> = {
  banco: 'Banco',
  efectivo: 'Efectivo',
  digital: 'Digital',
}

interface Props {
  cuentas: Cuenta[]
  /** Suma de monto_real de ingresos confirmados sin cuenta_destino_id (no contabilizados en cuentas) */
  ingresosSinCuenta?: number
}

export default function SaldoHeader({ cuentas, ingresosSinCuenta = 0 }: Props) {
  const [expanded, setExpanded] = useState(false)

  const cuentasLiquidas = cuentas.filter((c) => c.activa && c.tipo !== 'inversion')
  const saldoCuentas = cuentasLiquidas.reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)
  const saldoTotal = saldoCuentas + ingresosSinCuenta
  const positivo = saldoTotal >= 0

  return (
    <div className="rounded-xl border bg-card px-6 py-5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left"
      >
        <p className="text-sm font-medium text-muted-foreground">Saldo disponible</p>
        <div className="mt-1 flex items-center gap-2">
          {positivo ? (
            <TrendingUp className="size-5 text-emerald-500" />
          ) : (
            <TrendingDown className="size-5 text-destructive" />
          )}
          <span
            className={`text-3xl font-bold tracking-tight ${
              positivo ? 'text-emerald-500' : 'text-destructive'
            }`}
          >
            {formatMXN(saldoTotal)}
          </span>
          {cuentasLiquidas.length > 0 && (
            <ChevronDown
              className={`ml-auto size-4 text-muted-foreground transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
        {cuentasLiquidas.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Agrega tus cuentas para ver tu saldo real
          </p>
        )}
        {cuentasLiquidas.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {cuentasLiquidas.length} cuenta(s) — sin incluir inversiones
            {ingresosSinCuenta > 0 && (
              <span className="ml-2 text-emerald-600">
                + {formatMXN(ingresosSinCuenta)} en ingresos confirmados sin cuenta
              </span>
            )}
          </p>
        )}
      </button>

      {expanded && cuentasLiquidas.length > 0 && (
        <div className="mt-3 border-t pt-3 flex flex-col gap-2">
          {cuentasLiquidas.map((cuenta) => (
            <div key={cuenta.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{cuenta.nombre}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}
                </span>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums shrink-0 ${
                  Number(cuenta.saldo_actual ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                }`}
              >
                {formatMXN(Number(cuenta.saldo_actual ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
