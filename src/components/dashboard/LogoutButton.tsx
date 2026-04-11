'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/(auth)/actions'
import { cn } from '@/lib/utils'

export function LogoutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50',
        className
      )}
    >
      <LogOut className="size-4" />
      <span>{isPending ? 'Saliendo…' : 'Salir'}</span>
    </button>
  )
}
