import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'
import { TrendingUp, TrendingDown } from 'lucide-react'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  cuentas: Cuenta[]
  /** Suma de monto_real de ingresos confirmados sin cuenta_destino_id (no contabilizados en cuentas) */
  ingresosSinCuenta?: number
}

export default function SaldoHeader({ cuentas, ingresosSinCuenta = 0 }: Props) {
  const saldoCuentas = cuentas
    .filter((c) => c.activa && c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)

  const saldoTotal = saldoCuentas + ingresosSinCuenta

  const positivo = saldoTotal >= 0

  return (
    <div className="rounded-xl border bg-card px-6 py-5">
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
      </div>
      {cuentas.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Agrega tus cuentas para ver tu saldo real
        </p>
      )}
      {cuentas.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {cuentas.filter((c) => c.activa && c.tipo !== 'inversion').length}{' '}
          cuenta(s) — sin incluir inversiones
          {ingresosSinCuenta > 0 && (
            <span className="ml-2 text-emerald-600">
              + {formatMXN(ingresosSinCuenta)} en ingresos confirmados sin cuenta
            </span>
          )}
        </p>
      )}
    </div>
  )
}
