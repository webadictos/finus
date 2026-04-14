import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import CompromisoCard from '@/components/compromisos/CompromisoCard'
import NuevoCompromisoButton from '@/components/compromisos/NuevoCompromisoButton'
import LineasCreditoList from '@/components/compromisos/LineasCreditoList'
import PrestamoDadosSection from '@/components/compromisos/PrestamoDadosSection'
import type { Database } from '@/types/database'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type CargoLinea = Database['public']['Tables']['cargos_linea']['Row']
type PrestamoDado = Database['public']['Tables']['prestamos_dados']['Row']

export default async function CompromisosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'lineas' } = await searchParams
  const supabase = await createClient()

  const hoy = new Date()
  const startOfMonth = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const [
    cuentasRes,
    lineasRes,
    cargosRes,
    compromisosRes,
    pagosRes,
    ingresosRes,
    acuerdosRes,
    prestamosRes,
  ] = await Promise.all([
    supabase
      .from('cuentas')
      .select('*')
      .eq('activa', true)
      .neq('tipo', 'inversion')
      .order('nombre', { ascending: true }),
    supabase
      .from('lineas_credito')
      .select('*')
      .eq('activa', true)
      .order('fecha_proximo_pago', { ascending: true, nullsFirst: false }),
    supabase
      .from('cargos_linea')
      .select('*')
      .eq('activo', true),
    supabase
      .from('compromisos')
      .select('*')
      .eq('activo', true)
      .in('tipo_pago', ['fijo', 'prestamo', 'suscripcion', 'revolvente', 'msi', 'disposicion_efectivo'])
      .order('fecha_proximo_pago', { ascending: true, nullsFirst: false }),
    supabase
      .from('transacciones')
      .select('compromiso_id, monto')
      .eq('tipo', 'gasto')
      .gte('fecha', startOfMonth)
      .not('compromiso_id', 'is', null),
    supabase
      .from('ingresos')
      .select('estado, monto_real, monto_esperado')
      .eq('estado', 'confirmado')
      .is('cuenta_destino_id', null),
    supabase
      .from('acuerdos_pago')
      .select('*')
      .eq('activo', true)
      .eq('estado', 'activo'),
    supabase
      .from('prestamos_dados')
      .select('*')
      .eq('activo', true)
      .neq('estado', 'recuperado')
      .order('fecha_devolucion', { ascending: true, nullsFirst: false }),
  ])

  const lineas: LineaCredito[] = lineasRes.data ?? []
  const cargos: CargoLinea[] = cargosRes.data ?? []
  const compromisos: Compromiso[] = compromisosRes.data ?? []
  const cuentas = cuentasRes.data ?? []
  const acuerdos = acuerdosRes.data ?? []
  const prestamos: PrestamoDado[] = prestamosRes.data ?? []

  // Saldo disponible para recomendaciones en Tab 2
  const ingresosSinCuenta = (ingresosRes.data ?? []).reduce(
    (sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0),
    0
  )
  const saldoDisponible =
    cuentas.reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0) + ingresosSinCuenta

  // Índice de pagos este mes por compromiso_id
  const pagosEsteMes: Record<string, number> = {}
  for (const p of pagosRes.data ?? []) {
    if (p.compromiso_id) {
      pagosEsteMes[p.compromiso_id] =
        (pagosEsteMes[p.compromiso_id] ?? 0) + Number(p.monto ?? 0)
    }
  }

  // Índice de acuerdos por compromiso_id
  const acuerdoPorCompromiso: Record<string, typeof acuerdos[number]> = {}
  for (const a of acuerdos) {
    acuerdoPorCompromiso[a.compromiso_id] = a
  }

  const TABS = [
    { id: 'lineas', label: 'Líneas de crédito', count: lineas.length },
    { id: 'pagos', label: 'Pagos fijos', count: compromisos.length },
    { id: 'prestamos', label: 'Dinero que te deben', count: prestamos.length },
  ] as const

  const activeTab = tab === 'pagos' || tab === 'prestamos' ? tab : 'lineas'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Compromisos</h1>
        <p className="hidden md:block text-sm text-muted-foreground">
          Pagos recurrentes y deudas activas
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border -mb-2">
        {TABS.map(({ id, label, count }) => (
          <Link
            key={id}
            href={`?tab=${id}`}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                activeTab === id
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {count}
            </span>
          </Link>
        ))}
      </div>

      {/* Contenido del tab activo */}
      {activeTab === 'lineas' ? (
        <LineasCreditoList lineas={lineas} cargos={cargos} cuentas={cuentas} />
      ) : activeTab === 'pagos' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end">
            <NuevoCompromisoButton tarjetas={[]} label="Nuevo pago fijo" />
          </div>

          {compromisos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
              <CreditCard className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Sin pagos fijos registrados</p>
              <p className="text-xs text-muted-foreground">
                Agrega pagos fijos, préstamos o suscripciones. Los créditos se registran en líneas de crédito.
              </p>
              <NuevoCompromisoButton tarjetas={[]} label="Nuevo pago fijo" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {compromisos.map((c) => (
                <CompromisoCard
                  key={c.id}
                  compromiso={c}
                  saldoDisponible={saldoDisponible}
                  tarjetas={[]}
                  cuentas={cuentas}
                  pagadoEsteMes={pagosEsteMes[c.id] ?? null}
                  acuerdo={acuerdoPorCompromiso[c.id] ?? null}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <PrestamoDadosSection
          prestamos={prestamos}
          cuentas={cuentas}
        />
      )}
    </div>
  )
}
