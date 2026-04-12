'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog } from 'radix-ui'
import {
  LayoutDashboard,
  Receipt,
  Plus,
  CreditCard,
  Menu,
  TrendingUp,
  Landmark,
  WalletCards,
  BarChart3,
  Target,
  X,
} from 'lucide-react'
import RegistrarGastoForm from '@/components/gastos/RegistrarGastoForm'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
}

const MAS_ITEMS = [
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/cuentas', label: 'Cuentas', icon: Landmark },
  { href: '/tarjetas', label: 'Tarjetas', icon: WalletCards },
  { href: '/proyeccion', label: 'Proyección', icon: BarChart3 },
  { href: '/metas', label: 'Metas', icon: Target },
]

export default function MobileNav({ cuentas, tarjetas }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [quickOpen, setQuickOpen] = useState(false)
  const [masOpen, setMasOpen] = useState(false)
  const [gastoOpen, setGastoOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex h-16 border-t bg-card safe-bottom">
        {/* Dashboard */}
        <Link
          href="/"
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <LayoutDashboard className="size-5" />
          <span>Dashboard</span>
        </Link>

        {/* Gastos */}
        <Link
          href="/gastos"
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            isActive('/gastos') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Receipt className="size-5" />
          <span>Gastos</span>
        </Link>

        {/* Central "+" button */}
        <div className="flex-1 flex items-center justify-center relative">
          <button
            onClick={() => setQuickOpen(true)}
            className="absolute -top-5 flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-transform"
            aria-label="Acción rápida"
          >
            <Plus className="size-7" />
          </button>
        </div>

        {/* Compromisos */}
        <Link
          href="/compromisos"
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            isActive('/compromisos') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <CreditCard className="size-5" />
          <span>Compromisos</span>
        </Link>

        {/* Más */}
        <button
          onClick={() => setMasOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            masOpen ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Menu className="size-5" />
          <span>Más</span>
        </button>
      </nav>

      {/* Acciones rápidas sheet */}
      <Dialog.Root open={quickOpen} onOpenChange={setQuickOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out duration-200" />
          <Dialog.Content className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t bg-background p-6 pb-10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300 focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold">Acción rápida</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full p-1.5 hover:bg-muted transition-colors">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setQuickOpen(false); setGastoOpen(true) }}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left hover:bg-muted transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Receipt className="size-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Registrar gasto</p>
                  <p className="text-xs text-muted-foreground">Captura un gasto rápidamente</p>
                </div>
              </button>

              <button
                onClick={() => { setQuickOpen(false); router.push('/ingresos') }}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left hover:bg-muted transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <TrendingUp className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Confirmar ingreso</p>
                  <p className="text-xs text-muted-foreground">Registra dinero recibido</p>
                </div>
              </button>

              <button
                onClick={() => { setQuickOpen(false); router.push('/cuentas') }}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left hover:bg-muted transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Landmark className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Transferir</p>
                  <p className="text-xs text-muted-foreground">Mover dinero entre cuentas</p>
                </div>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Más opciones sheet */}
      <Dialog.Root open={masOpen} onOpenChange={setMasOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out duration-200" />
          <Dialog.Content className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t bg-background p-6 pb-10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300 focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold">Más opciones</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full p-1.5 hover:bg-muted transition-colors">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MAS_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMasOpen(false)}
                  className="flex flex-col items-center gap-2.5 rounded-xl border bg-card px-3 py-4 hover:bg-muted transition-colors"
                >
                  <Icon className="size-6 text-primary" />
                  <span className="text-xs font-medium text-center">{label}</span>
                </Link>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* RegistrarGastoForm desde acción rápida */}
      <RegistrarGastoForm
        open={gastoOpen}
        onOpenChange={setGastoOpen}
        cuentas={cuentas}
        tarjetas={tarjetas}
      />
    </>
  )
}
