import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { CreditCard } from 'lucide-react'
import CompromisoCard from '@/components/compromisos/CompromisoCard'
import NuevoCompromisoButton from '@/components/compromisos/NuevoCompromisoButton'
import AgregarCompromisoTarjetaButton from '@/components/compromisos/AgregarCompromisoTarjetaButton'
import EditarTarjetaButton from '@/components/tarjetas/EditarTarjetaButton'
import Badge from '@/components/shared/Badge'
import type { Database } from '@/types/database'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

export default async function CompromisosPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const startOfMonth = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const [cuentasRes, compromisosRes, tarjetasRes, pagosRes, ingresosRes] = await Promise.all([
    supabase.from('cuentas').select('*').eq('activa', true).neq('tipo', 'inversion').order('nombre', { ascending: true }),
    supabase
      .from('compromisos')
      .select('*')
      .eq('activo', true)
      .order('fecha_proximo_pago', { ascending: true, nullsFirst: false }),
    supabase.from('tarjetas').select('*').eq('activa', true).order('banco', { ascending: true }).order('nombre', { ascending: true }),
    supabase
      .from('transacciones')
      .select('compromiso_id, monto')
      .eq('tipo', 'gasto')
      .gte('fecha', startOfMonth)
      .not('compromiso_id', 'is', null),
    supabase
      .from('ingresos')
      .select('estado, cuenta_destino_id, monto_real, monto_esperado')
      .eq('estado', 'confirmado')
      .is('cuenta_destino_id', null),
  ])

  const compromisos: Compromiso[] = compromisosRes.data ?? []
  const tarjetas: Tarjeta[] = tarjetasRes.data ?? []
  const cuentas = cuentasRes.data ?? []

  const ingresosSinCuenta = (ingresosRes.data ?? []).reduce(
    (sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0),
    0
  )
  const saldoDisponible =
    cuentas.reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0) + ingresosSinCuenta

  const pagosEsteMes: Record<string, number> = {}
  for (const p of pagosRes.data ?? []) {
    if (p.compromiso_id) {
      pagosEsteMes[p.compromiso_id] =
        (pagosEsteMes[p.compromiso_id] ?? 0) + Number(p.monto ?? 0)
    }
  }

  const totalPorPagar = compromisos.reduce(
    (sum, c) => sum + Number(c.monto_mensualidad ?? 0),
    0
  )
  const totalPagadosEsteMes = Object.keys(pagosEsteMes).length

  // ── Grupos: todas las tarjetas activas (aunque estén vacías) + Sin tarjeta ──
  type Grupo = { tarjeta: Tarjeta | null; compromisos: Compromiso[] }

  const grupos: Grupo[] = tarjetas.map((t) => ({
    tarjeta: t,
    compromisos: compromisos.filter((c) => c.tarjeta_id === t.id),
  }))

  const sinTarjeta = compromisos.filter((c) => !c.tarjeta_id)
  grupos.push({ tarjeta: null, compromisos: sinTarjeta })

  const hayAlgo = compromisos.length > 0 || tarjetas.length > 0

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
          <p className="text-lg font-bold tabular-nums">{compromisos.length}</p>
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

      {/* Lista agrupada */}
      {!hayAlgo ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <CreditCard className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin compromisos registrados</p>
          <p className="text-xs text-muted-foreground">
            Agrega tus deudas y pagos recurrentes para ver recomendaciones
          </p>
          <NuevoCompromisoButton tarjetas={tarjetas} />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grupos.map(({ tarjeta, compromisos: lista }) => {
            const totalEstimado = lista.reduce(
              (s, c) => s + Number(c.monto_mensualidad ?? 0),
              0
            )
            const psi =
              tarjeta?.pago_sin_intereses != null
                ? Number(tarjeta.pago_sin_intereses)
                : null
            const pmin =
              tarjeta?.pago_minimo != null ? Number(tarjeta.pago_minimo) : null
            const tieneEdoCuenta = psi != null && pmin != null

            return (
              <div key={tarjeta?.id ?? 'sin-tarjeta'} className="flex flex-col gap-3">
                {/* Encabezado del grupo */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-semibold truncate">
                      {tarjeta ? `${tarjeta.banco} · ${tarjeta.nombre}` : 'Sin tarjeta'}
                    </span>
                    {tarjeta && (
                      <Badge
                        variant={tarjeta.tipo === 'departamental' ? 'orange' : 'info'}
                      >
                        {tarjeta.tipo === 'departamental' ? 'Departamental' : 'Crédito'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lista.length > 0 && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        Est.{' '}
                        <span className="font-medium text-foreground">
                          {formatMXN(totalEstimado)}
                        </span>
                      </span>
                    )}
                    {tarjeta && <EditarTarjetaButton tarjeta={tarjeta} />}
                  </div>
                </div>

                {/* Estado de cuenta real */}
                {tieneEdoCuenta && (
                  <div className="flex items-center gap-4 rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Estado de cuenta real
                    </span>
                    <span>
                      PSI{' '}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMXN(psi!)}
                      </span>
                    </span>
                    <span>
                      Mín{' '}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMXN(pmin!)}
                      </span>
                    </span>
                  </div>
                )}

                {/* Cards o estado vacío */}
                {lista.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {tarjeta ? 'Sin compromisos aún' : 'Sin compromisos directos'}
                    </p>
                    {!tarjeta && <NuevoCompromisoButton tarjetas={tarjetas} />}
                  </div>
                ) : (
                  lista.map((c) => (
                    <CompromisoCard
                      key={c.id}
                      compromiso={c}
                      saldoDisponible={saldoDisponible}
                      tarjetas={tarjetas}
                      cuentas={cuentas}
                      pagadoEsteMes={pagosEsteMes[c.id] ?? null}
                    />
                  ))
                )}

                {/* Acción al pie */}
                {tarjeta ? (
                  <AgregarCompromisoTarjetaButton
                    tarjetaId={tarjeta.id}
                    tarjetas={tarjetas}
                  />
                ) : lista.length > 0 ? (
                  <NuevoCompromisoButton tarjetas={tarjetas} />
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
