import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PresupuestoClient from '@/components/presupuesto/PresupuestoClient'

export default async function PresupuestoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: partidas } = await supabase
    .from('presupuesto_operativo')
    .select('*')
    .eq('usuario_id', user.id)
    .eq('activo', true)
    .order('categoria', { ascending: true })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Presupuesto operativo</h1>
        <p className="hidden md:block text-sm text-muted-foreground mt-0.5">
          Lo que necesitas para operar antes de pagar deudas
        </p>
      </div>

      <PresupuestoClient partidas={partidas ?? []} />
    </div>
  )
}
