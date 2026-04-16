import { Receipt } from 'lucide-react'
import { formatFecha, formatMXN } from '@/lib/format'
import { getGastoCategoriaLabel } from '@/lib/gasto-categorias'
import type { Database } from '@/types/database'

type Transaccion = Database['public']['Tables']['transacciones']['Row']

interface Props {
  gastos: Transaccion[]
}

export default function UltimosGastos({ gastos }: Props) {
  if (gastos.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Últimos gastos</h2>
        </div>
        <p className="text-sm text-muted-foreground">Aún no hay gastos registrados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="size-4 text-destructive" />
        <h2 className="text-sm font-semibold">
          Últimos gastos{' '}
          <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            {gastos.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col divide-y">
        {gastos.map((gasto) => {
          const monto = Number(gasto.monto ?? 0)
          const descripcion = gasto.descripcion || getGastoCategoriaLabel(gasto.categoria ?? 'otro') || 'Gasto'
          const categoria = getGastoCategoriaLabel(gasto.categoria)

          return (
            <div
              key={gasto.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{descripcion}</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {categoria && <span>{categoria}</span>}
                  {categoria && <span>·</span>}
                  <span>{formatFecha(gasto.fecha)}</span>
                </div>
              </div>

              <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
                -{formatMXN(monto)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 border-t pt-3">
        <a
          href="/gastos"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Ver todos los gastos →
        </a>
      </div>
    </div>
  )
}
