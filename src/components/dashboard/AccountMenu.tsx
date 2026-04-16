'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Dialog, DropdownMenu } from 'radix-ui'
import { ChevronsUpDown, LogOut, Settings, X } from 'lucide-react'
import { logoutAction } from '@/app/(auth)/actions'
import { cn } from '@/lib/utils'

interface Props {
  nombre: string
  email: string
  variant: 'desktop' | 'mobile'
}

function getInitials(nombre: string, email: string): string {
  const source = nombre.trim() || email.trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export default function AccountMenu({ nombre, email, variant }: Props) {
  const initials = getInitials(nombre, email)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (variant === 'mobile') {
    return (
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label="Abrir menú de cuenta"
            className="flex items-center gap-2 rounded-full border bg-background px-2 py-1 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </span>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out duration-200" />
          <Dialog.Content className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl border-t bg-background p-6 pb-10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300 focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold">Tu cuenta</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="rounded-2xl border bg-card">
              <div className="border-b px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{nombre}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <Link
                  href="/configuracion"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  Configuración
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    startTransition(() => logoutAction())
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  {isPending ? 'Saliendo…' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-colors hover:bg-muted',
            'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side="top"
          sideOffset={8}
          className="z-50 min-w-[240px] rounded-xl border bg-popover shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="border-b px-3 py-3">
            <p className="text-sm font-semibold truncate">{nombre}</p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{email}</p>
          </div>

          <div className="p-1">
            <DropdownMenu.Item asChild>
              <Link
                href="/configuracion"
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-accent data-[highlighted]:bg-accent"
              >
                <Settings className="size-4 text-muted-foreground" />
                Configuración
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 data-[highlighted]:bg-destructive/10"
              onSelect={() => startTransition(() => logoutAction())}
            >
              <LogOut className="size-4" />
              {isPending ? 'Saliendo…' : 'Cerrar sesión'}
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
