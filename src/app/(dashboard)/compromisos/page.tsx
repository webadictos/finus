import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { CreditCard } from 'lucide-react'
import CompromisoCard from '@/components/compromisos/CompromisoCard'
import NuevoCompromisoButton from '@/components/compromisos/NuevoCompromisoButton'
import type { Database } from '@/types/database'

type Compromiso = Database['public']['Tables']['compromisos']['Row']

export default async function CompromisosPage() {
  const supabase = await createClient()

  // Primer día del mes actual para detectar pagos de este mes
  const hoy = new Date()
  const startOfMonth = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const [cuentasRes, compromisosRes, tarjetasRes, pagosRes] = await Promise.all([
    supabase.from('cuentas').select('saldo_actual, tipo, activa'),
    supabase
      .from('compromisos')
      .select('*')
      .eq('activo', true)
      .order('fecha_proximo_pago', { ascending: true, nullsFirst: false }),
    supabase.from('tarjetas').select('*').eq('activa', true),
    supabase
      .from('transacciones')
      .select('compromiso_id, monto')
      .eq('tipo', 'gasto')
      .gte('fecha', startOfMonth)
      .not('compromiso_id', 'is', null),
  ])

  const compromisos: Compromiso[] = compromisosRes.data ?? []
  const tarjetas = tarjetasRes.data ?? []

  // Saldo disponible (cuentas líquidas activas)
  const saldoDisponible = (cuentasRes.data ?? [])
    .filter((c) => c.activa && c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)

  // Mapa de pagos este mes: compromiso_id → monto total pagado
  const pagosEsteMes: Record<string, number> = {}
  for (const p of pagosRes.data ?? []) {
    if (p.compromiso_id) {
      pagosEsteMes[p.compromiso_id] =
        (pagosEsteMes[p.compromiso_id] ?? 0) + Number(p.monto ?? 0)
    }
  }

  // KPIs del resumen
  const totalPorPagar = compromisos.reduce(
    (sum, c) => sum + Number(c.monto_mensualidad ?? 0),
    0
  )
  const totalActivos = compromisos.length
  const totalPagadosEsteMes = Object.keys(pagosEsteMes).length

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Compromisos</h1>
          <p className="text-sm text-muted-foreground">
            Pagos recurrentes y deudas activas
          </p>
        </div>
        <NuevoCompromisoButton tarjetas={tarjetas} />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Por pagar</p>
          <p className="text-lg font-bold text-destructive tabular-nums">
            {formatMXN(totalPorPagar)}
          </p>
          <p className="text-xs text-muted-foreground">suma de mensualidades</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Activos</p>
          <p className="text-lg font-bold tabular-nums">{totalActivos}</p>
          <p className="text-xs text-muted-foreground">compromisos</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagados</p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">
            {totalPagadosEsteMes}
          </p>
          <p className="text-xs text-muted-foreground">este mes</p>
        </div>
      </div>

      {/* Lista */}
      {compromisos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <CreditCard className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin compromisos registrados</p>
          <p className="text-xs text-muted-foreground">
            Agrega tus deudas y pagos recurrentes para ver recomendaciones
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {compromisos.map((c) => (
            <CompromisoCard
              key={c.id}
              compromiso={c}
              saldoDisponible={saldoDisponible}
              tarjetas={tarjetas}
              pagadoEsteMes={pagosEsteMes[c.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
