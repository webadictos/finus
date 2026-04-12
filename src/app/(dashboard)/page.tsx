import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import SaldoHeader from '@/components/dashboard/SaldoHeader'
import KPICards from '@/components/dashboard/KPICards'
import AlertasVencimiento from '@/components/dashboard/AlertasVencimiento'
import ProximosIngresos from '@/components/dashboard/ProximosIngresos'
import ProximosGastosPrevistos from '@/components/dashboard/ProximosGastosPrevistos'
import AconsejameButton from '@/components/dashboard/AconsejameButton'
import NuevaTransferenciaButton from '@/components/cuentas/NuevaTransferenciaButton'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Compromiso = Database['public']['Tables']['compromisos']['Row']
type GastoPrevisto = Database['public']['Tables']['gastos_previstos']['Row']

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

  const [cuentasRes, ingresosRes, compromisosRes, gastosPrevistoRes] = await Promise.all([
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
  ])

  const cuentas: Cuenta[] = cuentasRes.data ?? []
  const ingresos: Ingreso[] = ingresosRes.data ?? []
  const compromisos: Compromiso[] = compromisosRes.data ?? []
  const gastosPrevistos: GastoPrevisto[] = gastosPrevistoRes.data ?? []

  // Ingresos confirmados sin cuenta_destino_id: no llamaron incrementar_saldo,
  // por lo que no están reflejados en cuentas.saldo_actual.
  const ingresosSinCuenta = ingresos
    .filter((i) => i.estado === 'confirmado' && !i.cuenta_destino_id)
    .reduce((sum, i) => sum + Number(i.monto_real ?? i.monto_esperado ?? 0), 0)

  const saldoDisponible = cuentas
    .filter((c) => c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0) + ingresosSinCuenta

  return (
    <>
      <SaldoHeader cuentas={cuentas} ingresosSinCuenta={ingresosSinCuenta} />
      <KPICards cuentas={cuentas} ingresos={ingresos} compromisos={compromisos} />
      <div className="flex gap-2">
        <div className="flex-1">
          <AconsejameButton />
        </div>
        {cuentas.length >= 2 && (
          <NuevaTransferenciaButton
            cuentas={cuentas}
            label="Transferir"
            variant="outline"
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AlertasVencimiento compromisos={compromisos} saldoDisponible={saldoDisponible} />
        <ProximosIngresos ingresos={ingresos} />
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
