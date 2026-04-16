import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracionClient from '@/components/configuracion/ConfiguracionClient'
import {
  DEFAULT_IDLE_LOCK_ENABLED,
  DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
  normalizeIdleLockEnabled,
  normalizeIdleLockTimeoutMinutes,
} from '@/lib/idle-lock'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch perfil desde tabla usuarios
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre, email, idle_lock_enabled, idle_lock_timeout_minutes')
    .eq('id', user.id)
    .single()

  const nombre = perfil?.nombre ?? (user.user_metadata?.nombre as string | null) ?? null
  const email = perfil?.email ?? user.email ?? ''
  const idleLockEnabled = normalizeIdleLockEnabled(
    perfil?.idle_lock_enabled ?? DEFAULT_IDLE_LOCK_ENABLED
  )
  const idleLockTimeoutMinutes = normalizeIdleLockTimeoutMinutes(
    perfil?.idle_lock_timeout_minutes ?? DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES
  )

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Configuración</h1>
        <p className="hidden md:block text-sm text-muted-foreground">Perfil y preferencias de tu cuenta</p>
      </div>

      <ConfiguracionClient
        nombre={nombre}
        email={email}
        idleLockEnabled={idleLockEnabled}
        idleLockTimeoutMinutes={idleLockTimeoutMinutes}
      />
    </div>
  )
}
