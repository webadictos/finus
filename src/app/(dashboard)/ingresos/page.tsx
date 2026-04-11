import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { TrendingUp } from 'lucide-react'
import IngresoCard from '@/components/ingresos/IngresoCard'
import NuevoIngresoButton from '@/components/ingresos/NuevoIngresoButton'
import type { Database } from '@/types/database'

type Ingreso = Database['public']['Tables']['ingresos']['Row']

export default async function IngresosPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const startOfMonth = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data }, cuentasRes] = await Promise.all([
    supabase
      .from('ingresos')
      .select('*')
      .order('fecha_esperada', { ascending: true, nullsFirst: false }),
    supabase
      .from('cuentas')
      .select('*')
      .eq('activa', true)
      .neq('tipo', 'inversion')
      .order('nombre', { ascending: true }),
  ])

  const ingresos: Ingreso[] = data ?? []
  const cuentas = cuentasRes.data ?? []

  // Separar en confirmados y pendientes
  const confirmados = ingresos.filter((i) => i.estado === 'confirmado')
  const pendientes = ingresos.filter((i) => i.estado !== 'confirmado')

  // KPIs
  const totalConfirmadoMes = confirmados
    .filter((i) => i.fecha_real && i.fecha_real >= startOfMonth)
    .reduce((sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0), 0)

  const totalPendiente = pendientes
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0), 0)

  const totalEsperado = ingresos
    .reduce((sum, i) => sum + Number(i.monto_esperado ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Ingresos</h1>
          <p className="text-sm text-muted-foreground">
            Flujo de entradas esperadas y confirmadas
          </p>
        </div>
        <NuevoIngresoButton cuentas={cuentas} />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Confirmado este mes
          </p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">
            {formatMXN(totalConfirmadoMes)}
          </p>
          <p className="text-xs text-muted-foreground">{confirmados.length} ingresos</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendiente</p>
          <p className="text-lg font-bold tabular-nums">{formatMXN(totalPendiente)}</p>
          <p className="text-xs text-muted-foreground">{pendientes.length} esperados</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Total esperado
          </p>
          <p className="text-lg font-bold tabular-nums">{formatMXN(totalEsperado)}</p>
          <p className="text-xs text-muted-foreground">todos los ingresos</p>
        </div>
      </div>

      {ingresos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <TrendingUp className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin ingresos registrados</p>
          <p className="text-xs text-muted-foreground">
            Agrega tus fuentes de ingreso para proyectar tu flujo de efectivo
          </p>
        </div>
      ) : (
        <>
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pendientes ({pendientes.length})
              </h2>
              {pendientes.map((i) => (
                <IngresoCard key={i.id} ingreso={i} cuentas={cuentas} />
              ))}
            </section>
          )}

          {/* Confirmados */}
          {confirmados.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Confirmados ({confirmados.length})
              </h2>
              {confirmados.map((i) => (
                <IngresoCard key={i.id} ingreso={i} cuentas={cuentas} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
