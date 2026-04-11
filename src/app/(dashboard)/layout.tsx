import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Wallet,
  BarChart3,
  Target,
  WalletCards,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cuentas', label: 'Cuentas', icon: Landmark },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/tarjetas', label: 'Tarjetas', icon: WalletCards },
  { href: '/compromisos', label: 'Compromisos', icon: CreditCard },
  { href: '/gastos', label: 'Gastos', icon: Wallet },
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <span className="text-lg font-bold tracking-tight">Finus</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t p-3">
          <div className="rounded-md px-3 py-2">
            <p className="text-sm font-medium truncate">{nombre}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <div className="px-3 py-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b bg-card px-4 py-3">
          <span className="text-base font-bold">Finus</span>
          <LogoutButton />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>

        {/* Bottom nav — mobile */}
        <nav className="md:hidden flex border-t bg-card">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Icon className="size-5" />
              <span className="leading-none">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
