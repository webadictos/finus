import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import SaldoHeader from '@/components/dashboard/SaldoHeader'
import KPICards from '@/components/dashboard/KPICards'
import AlertasVencimiento from '@/components/dashboard/AlertasVencimiento'
import ProximosIngresos from '@/components/dashboard/ProximosIngresos'
import ProximosGastosPrevistos from '@/components/dashboard/ProximosGastosPrevistos'
import CompromisosVencidos from '@/components/dashboard/CompromisosVencidos'
import NuevaTransferenciaButton from '@/components/cuentas/NuevaTransferenciaButton'
import ObtenerLiquidezButton from '@/components/dashboard/ObtenerLiquidezButton'
import { getProjectedRecurringIngresos } from '@/lib/ingresos'
import { calcularReservaOperativa } from '@/lib/presupuesto'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Compromiso = Database['public']['Tables']['compromisos']['Row']
type GastoPrevisto = Database['public']['Tables']['gastos_previstos']['Row']
type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type CargoLinea = Database['public']['Tables']['cargos_linea']['Row']
type PresupuestoOperativo = Database['public']['Tables']['presupuesto_operativo']['Row']

// Esqueleto simple reutilizable para Suspense
function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card px-5 py-4 animate-pulse ${className}`}>
      <div className="h-4 w-1/3 rounded bg-muted mb-3" />
      <div className="h-6 w-1/2 rounded bg-muted" />
    </div>
  )
}

async function DashboardData() {
  const supabase = await createClient()

  const [cuentasRes, ingresosRes, compromisosRes, gastosPrevistoRes, lineasRes, cargosRes, presupuestoRes] = await Promise.all([
    supabase
      .from('cuentas')
      .select('*')
      .eq('activa', true)
      .order('saldo_actual', { ascending: false }),
    supabase
      .from('ingresos')
      .select('*')
      .order('fecha_esperada', { ascending: true, nullsFirst: false }),
    supabase
      .from('compromisos')
      .select('*')
      .eq('activo', true)
      .order('fecha_proximo_pago', { ascending: true, nullsFirst: false }),
    supabase
      .from('gastos_previstos')
      .select('*')
      .eq('activo', true)
      .eq('realizado', false)
      .order('fecha_sugerida', { ascending: true, nullsFirst: false }),
    supabase
      .from('lineas_credito')
      .select('*')
      .eq('activa', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('cargos_linea')
      .select('*')
      .eq('activo', true),
    supabase
      .from('presupuesto_operativo')
      .select('*')
      .eq('activo', true),
  ])

  const cuentas: Cuenta[] = cuentasRes.data ?? []
  const ingresos: Ingreso[] = ingresosRes.data ?? []
  const compromisos: Compromiso[] = compromisosRes.data ?? []
  const gastosPrevistos: GastoPrevisto[] = gastosPrevistoRes.data ?? []
  const lineas: LineaCredito[] = lineasRes.data ?? []
  const cargos: CargoLinea[] = cargosRes.data ?? []
  const partidas: PresupuestoOperativo[] = presupuestoRes.data ?? []
  const reservaOperativa = calcularReservaOperativa(partidas, 7)

  // Ingresos confirmados sin cuenta_destino_id: no llamaron incrementar_saldo,
  // por lo que no están reflejados en cuentas.saldo_actual.
  const ingresosSinCuenta = ingresos
    .filter((i) => i.estado === 'confirmado' && !i.cuenta_destino_id)
    .reduce((sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0), 0)

  const saldoDisponible = cuentas
    .filter((c) => c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0) + ingresosSinCuenta

  const ingresosConRecurrentes = [
    ...ingresos,
    ...getProjectedRecurringIngresos(ingresos),
  ]

  return (
    <>
      <SaldoHeader cuentas={cuentas} ingresosSinCuenta={ingresosSinCuenta} />
      <KPICards cuentas={cuentas} ingresos={ingresosConRecurrentes} compromisos={compromisos} lineas={lineas} reservaOperativa={reservaOperativa} />
      <div className="flex gap-2 flex-wrap">
        <ObtenerLiquidezButton lineas={lineas} cuentas={cuentas.filter((c) => c.tipo !== 'inversion')} />
        {cuentas.length >= 2 && (
          <NuevaTransferenciaButton
            cuentas={cuentas}
            label="Transferir"
            variant="outline"
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CompromisosVencidos
          compromisos={compromisos}
          cuentas={cuentas}
          saldoDisponible={saldoDisponible}
          reservaOperativa={reservaOperativa}
        />
        <AlertasVencimiento
          compromisos={compromisos}
          lineas={lineas}
          cargos={cargos}
          cuentas={cuentas}
          saldoDisponible={saldoDisponible}
          reservaOperativa={reservaOperativa}
        />
        <div id="proximos-ingresos">
          <ProximosIngresos ingresos={ingresosConRecurrentes} cuentas={cuentas} />
        </div>
        <ProximosGastosPrevistos gastos={gastosPrevistos} />
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="hidden md:block text-sm text-muted-foreground">Tu flujo de efectivo de un vistazo</p>
      </div>

      <Suspense
        fallback={
          <>
            <CardSkeleton />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CardSkeleton className="min-h-32" />
              <CardSkeleton className="min-h-32" />
            </div>
          </>
        }
      >
        <DashboardData />
      </Suspense>
    </div>
  )
}
