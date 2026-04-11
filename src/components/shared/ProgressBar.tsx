import { cn } from '@/lib/utils'

interface Props {
  /** Valor actual (ej. saldo disponible) */
  value: number
  /** Valor máximo (ej. monto a pagar) */
  max: number
  className?: string
}

export default function ProgressBar({ value, max, className }: Props) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const canAfford = value >= max

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          canAfford ? 'bg-emerald-500' : 'bg-red-500'
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
