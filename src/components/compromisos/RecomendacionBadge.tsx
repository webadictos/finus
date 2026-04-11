import type { Recomendacion, ColorRecomendacion } from '@/types/finus'
import { cn } from '@/lib/utils'

const COLOR_MAP: Record<ColorRecomendacion, string> = {
  verde: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  amarillo: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400',
  naranja: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400',
  rojo: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400',
  morado: 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400',
  rojo_fuerte: 'bg-red-600/15 text-red-700 border-red-600/30 font-semibold dark:text-red-400',
}

interface Props {
  recomendacion: Recomendacion
  className?: string
}

export default function RecomendacionBadge({ recomendacion, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-md border px-2.5 py-1.5 text-xs leading-snug',
        COLOR_MAP[recomendacion.color],
        className
      )}
    >
      <p className="font-medium">{recomendacion.accion}</p>
      {recomendacion.detalle && (
        <p className="mt-0.5 opacity-80">{recomendacion.detalle}</p>
      )}
    </div>
  )
}
