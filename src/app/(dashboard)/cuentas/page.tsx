import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { Landmark, AlertTriangle } from 'lucide-react'
import CuentaCard from '@/components/cuentas/CuentaCard'
import NuevaCuentaButton from '@/components/cuentas/NuevaCuentaButton'
import NuevaTransferenciaButton from '@/components/cuentas/NuevaTransferenciaButton'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

const TIPO_ORDER: Record<string, number> = {
  banco: 0,
  digital: 1,
  efectivo: 2,
  inversion: 3,
}

export default async function CuentasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('cuentas')
    .select('*')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  const cuentas: Cuenta[] = (data ?? []).sort(
    (a, b) => (TIPO_ORDER[a.tipo] ?? 99) - (TIPO_ORDER[b.tipo] ?? 99)
  )

  const saldoTotal = cuentas
    .filter((c) => c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)

  const tieneEfectivo = cuentas.some((c) => c.tipo === 'efectivo')

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Cuentas</h1>
          <p className="text-sm text-muted-foreground">
            Tus cuentas bancarias, efectivo e inversiones
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cuentas.length >= 2 && (
            <NuevaTransferenciaButton cuentas={cuentas} label="Transferir" />
          )}
          <NuevaCuentaButton />
        </div>
      </div>

      {/* Resumen de saldo */}
      {cuentas.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">Saldo líquido total</p>
          <p
            className={`text-2xl font-bold tabular-nums mt-1 ${
              saldoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {formatMXN(saldoTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sin incluir inversiones · {cuentas.filter((c) => c.tipo !== 'inversion').length} cuenta(s)
          </p>
        </div>
      )}

      {/* Banner sin cuenta de efectivo */}
      {cuentas.length > 0 && !tieneEfectivo && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-500/10 px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-yellow-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 leading-snug">
              <span className="font-semibold">No tienes una cuenta de efectivo registrada.</span>{' '}
              Te recomendamos crearla para registrar ingresos y gastos en efectivo correctamente.
            </p>
          </div>
          <div className="shrink-0">
            <NuevaCuentaButton
              tipoDefault="efectivo"
              label="Crear"
              variant="outline"
            />
          </div>
        </div>
      )}

      {/* Lista o estado vacío */}
      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <Landmark className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin cuentas registradas</p>
          <p className="text-xs text-muted-foreground">
            Agrega tus cuentas de banco, efectivo e inversiones para controlar tu saldo real
          </p>
          <NuevaCuentaButton />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cuentas.map((c) => (
            <CuentaCard key={c.id} cuenta={c} />
          ))}
        </div>
      )}
    </div>
  )
}
