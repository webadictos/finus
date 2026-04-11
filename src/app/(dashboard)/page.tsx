import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import SaldoHeader from '@/components/dashboard/SaldoHeader'
import KPICards from '@/components/dashboard/KPICards'
import AlertasVencimiento from '@/components/dashboard/AlertasVencimiento'
import ProximosIngresos from '@/components/dashboard/ProximosIngresos'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Compromiso = Database['public']['Tables']['compromisos']['Row']

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

  const [cuentasRes, ingresosRes, compromisosRes] = await Promise.all([
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
  ])

  const cuentas: Cuenta[] = cuentasRes.data ?? []
  const ingresos: Ingreso[] = ingresosRes.data ?? []
  const compromisos: Compromiso[] = compromisosRes.data ?? []

  const saldoDisponible = cuentas
    .filter((c) => c.tipo !== 'inversion')
    .reduce((sum, c) => sum + Number(c.saldo_actual ?? 0), 0)

  return (
    <>
      <SaldoHeader cuentas={cuentas} />
      <KPICards cuentas={cuentas} ingresos={ingresos} compromisos={compromisos} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AlertasVencimiento compromisos={compromisos} saldoDisponible={saldoDisponible} />
        <ProximosIngresos ingresos={ingresos} />
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Tu flujo de efectivo de un vistazo</p>
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
