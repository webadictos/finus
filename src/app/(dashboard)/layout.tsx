import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AccountMenu from '@/components/dashboard/AccountMenu'
import DashboardShell from '@/components/dashboard/DashboardShell'
import SidebarRegistrarGastoButton from '@/components/dashboard/SidebarRegistrarGastoButton'
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Wallet,
  BarChart3,
  Target,
  Landmark,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseTags, type TagItem } from '@/lib/tags'
import {
  DEFAULT_IDLE_LOCK_ENABLED,
  DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
  normalizeIdleLockEnabled,
  normalizeIdleLockTimeoutMinutes,
} from '@/lib/idle-lock'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gastos', label: 'Gastos', icon: Wallet },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/compromisos', label: 'Compromisos', icon: CreditCard },
  { href: '/cuentas', label: 'Cuentas', icon: Landmark },
  { href: '/proyeccion', label: 'Proyección', icon: BarChart3 },
  { href: '/presupuesto', label: 'Presupuesto', icon: ShieldCheck },
  { href: '/metas', label: 'Metas', icon: Target },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nombre =
    (user?.user_metadata?.nombre as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Usuario'

  const email = user?.email ?? ''
  const { data: perfil } = user
    ? await supabase
        .from('usuarios')
        .select('nombre, email, idle_lock_enabled, idle_lock_timeout_minutes')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const nombreDisplay = perfil?.nombre ?? nombre
  const emailDisplay = perfil?.email ?? email
  const idleLockEnabled = normalizeIdleLockEnabled(
    perfil?.idle_lock_enabled ?? DEFAULT_IDLE_LOCK_ENABLED
  )
  const idleLockTimeoutMinutes = normalizeIdleLockTimeoutMinutes(
    perfil?.idle_lock_timeout_minutes ?? DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES
  )

  const [cuentasRes, tarjetasRes, etiquetasRes] = await Promise.all([
    supabase.from('cuentas').select('*').eq('activa', true).order('nombre', { ascending: true }),
    supabase.from('tarjetas').select('*').eq('activa', true).order('nombre', { ascending: true }),
    supabase
      .from('transacciones')
      .select('etiquetas')
      .eq('usuario_id', user?.id ?? '')
      .eq('tipo', 'gasto')
      .not('etiquetas', 'is', null),
  ])

  const cuentas = cuentasRes.data ?? []
  const tarjetas = tarjetasRes.data ?? []
  const etiquetasMap = new Map<string, TagItem>()
  for (const tx of etiquetasRes.data ?? []) {
    for (const tag of parseTags(tx.etiquetas)) {
      if (!etiquetasMap.has(tag.slug)) {
        etiquetasMap.set(tag.slug, tag)
      }
    }
  }
  const etiquetasSugeridas = Array.from(etiquetasMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es-MX')
  )

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-card sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <Link href="/">
            <img src="/finus.svg" height={32} alt="Finus" style={{ height: 32 }} />
          </Link>
        </div>

        {/* CTA Registrar gasto */}
        <div className="px-3 pt-3 pb-1">
          <SidebarRegistrarGastoButton
            cuentas={cuentas}
            tarjetas={tarjetas}
            etiquetasSugeridas={etiquetasSugeridas}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + configuración */}
        <div className="border-t p-3">
          <AccountMenu nombre={nombreDisplay} email={emailDisplay} variant="desktop" />
        </div>
      </aside>

      {/* Main content */}
      <DashboardShell
        cuentas={cuentas}
        tarjetas={tarjetas}
        etiquetasSugeridas={etiquetasSugeridas}
        nombre={nombreDisplay}
        email={emailDisplay}
        idleLockEnabled={idleLockEnabled}
        idleLockTimeoutMinutes={idleLockTimeoutMinutes}
      >
        {children}
      </DashboardShell>
    </div>
  )
}
