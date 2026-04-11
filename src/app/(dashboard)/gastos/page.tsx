import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GastosClient from '@/components/gastos/GastosClient'

export default async function GastosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [transRes, cuentasRes, tarjetasRes] = await Promise.all([
    supabase
      .from('transacciones')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('tipo', 'gasto')
      .gte('fecha', firstDay)
      .lte('fecha', today)
      .order('fecha', { ascending: false }),
    supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activa', true)
      .neq('tipo', 'inversion')
      .order('nombre', { ascending: true }),

    supabase
      .from('tarjetas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activa', true)
      .order('nombre', { ascending: true }),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro de gastos del mes actual
        </p>
      </div>

      <GastosClient
        transacciones={transRes.data ?? []}
        cuentas={cuentasRes.data ?? []}
        tarjetas={tarjetasRes.data ?? []}
      />
    </div>
  )
}
