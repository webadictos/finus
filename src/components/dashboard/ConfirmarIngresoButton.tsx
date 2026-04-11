'use client'

import { useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { confirmarIngresoAction } from '@/app/(dashboard)/actions'
import { cn } from '@/lib/utils'

interface Props {
  ingresoId: string
  className?: string
}

export function ConfirmarIngresoButton({ ingresoId, className }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => confirmarIngresoAction(ingresoId))}
      disabled={isPending}
      className={cn(
        'flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400',
        className
      )}
    >
      <CheckCircle className="size-3.5" />
      {isPending ? 'Confirmando…' : 'Confirmar'}
    </button>
  )
}
