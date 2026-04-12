import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProyeccionClient from '@/components/proyeccion/ProyeccionClient'

export default async function ProyeccionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [cuentasRes, ingresosRes, compromisosRes, gastosRes] = await Promise.all([
    supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activa', true)
      .neq('tipo', 'inversion'),
    supabase
      .from('ingresos')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('estado', 'esperado')
      .order('fecha_esperada', { ascending: true }),
    supabase
      .from('compromisos')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .order('fecha_proximo_pago', { ascending: true }),
    supabase
      .from('gastos_previstos')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .order('created_at', { ascending: false }),
  ])

  const saldoActual = (cuentasRes.data ?? []).reduce(
    (sum, c) => sum + Number(c.saldo_actual ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Proyección</h1>
        <p className="hidden md:block text-sm text-muted-foreground mt-0.5">
          Visualiza tu flujo de efectivo futuro
        </p>
      </div>

      <ProyeccionClient
        saldoActual={saldoActual}
        cuentas={cuentasRes.data ?? []}
        ingresos={ingresosRes.data ?? []}
        compromisos={compromisosRes.data ?? []}
        gastosPrevistos={gastosRes.data ?? []}
      />
    </div>
  )
}
