import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MobileNav from '@/components/dashboard/MobileNav'
import SidebarRegistrarGastoButton from '@/components/dashboard/SidebarRegistrarGastoButton'
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Wallet,
  BarChart3,
  Target,
  Landmark,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gastos', label: 'Gastos', icon: Wallet },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/compromisos', label: 'Compromisos', icon: CreditCard },
  { href: '/cuentas', label: 'Cuentas', icon: Landmark },
  { href: '/proyeccion', label: 'Proyección', icon: BarChart3 },
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

  const [cuentasRes, tarjetasRes] = await Promise.all([
    supabase.from('cuentas').select('*').eq('activa', true).order('nombre', { ascending: true }),
    supabase.from('tarjetas').select('*').eq('activa', true).order('nombre', { ascending: true }),
  ])

  const cuentas = cuentasRes.data ?? []
  const tarjetas = tarjetasRes.data ?? []

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
          <SidebarRegistrarGastoButton cuentas={cuentas} tarjetas={tarjetas} />
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
          <div className="rounded-md px-3 py-2">
            <p className="text-sm font-medium truncate">{nombre}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <Link
            href="/configuracion"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            )}
          >
            <Settings className="size-4 shrink-0" />
            Configuración
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b bg-card px-4 py-3">
          <Link href="/">
            <img src="/finus-logo.svg" height={36} alt="Finus" style={{ height: 36 }} />
          </Link>
          <Link href="/configuracion" className="p-1 text-muted-foreground hover:text-foreground">
            <Settings className="size-5" />
          </Link>
        </header>

        {/* pb-16 leaves space for the fixed mobile bottom nav */}
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>

        {/* Bottom nav — mobile (fixed, rendered via Client Component) */}
        <MobileNav cuentas={cuentas} tarjetas={tarjetas} />
      </div>
    </div>
  )
}
