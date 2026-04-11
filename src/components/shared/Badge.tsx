import { cn } from '@/lib/utils'

const VARIANTS = {
  default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  error: 'bg-red-500/10 text-red-700 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  purple: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

export type BadgeVariant = keyof typeof VARIANTS

interface Props {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
