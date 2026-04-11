import {
  UtensilsCrossed,
  Fuel,
  ShoppingCart,
  Heart,
  BookOpen,
  Music,
  ShoppingBag,
  AlertTriangle,
  Wallet,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Transaccion = Database['public']['Tables']['transacciones']['Row']

const CATEGORIA_ICONS: Record<string, LucideIcon> = {
  comida: UtensilsCrossed,
  gasolina: Fuel,
  despensa: ShoppingCart,
  salud: Heart,
  escuela: BookOpen,
  entretenimiento: Music,
  mascota: Heart,
  ropa: ShoppingBag,
  imprevisto: AlertTriangle,
  varios_efectivo: Wallet,
  otro: Tag,
}

const CATEGORIA_LABEL: Record<string, string> = {
  comida: 'Comida',
  gasolina: 'Gasolina',
  despensa: 'Despensa',
  salud: 'Salud',
  escuela: 'Escuela',
  entretenimiento: 'Entretenimiento',
  mascota: 'Mascota',
  ropa: 'Ropa',
  imprevisto: 'Imprevisto',
  varios_efectivo: 'Varios efectivo',
  otro: 'Otro',
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito_revolvente: 'Crédito',
  msi: 'MSI',
  prestamo: 'Préstamo',
}

interface Props {
  transaccion: Transaccion
  tarjetaNombre?: string | null
}

export default function GastoCard({ transaccion, tarjetaNombre }: Props) {
  const monto = Number(transaccion.monto ?? 0)
  const categoria = transaccion.categoria ?? 'otro'
  const Icon = CATEGORIA_ICONS[categoria] ?? Tag
  const fechaDisplay = new Date(transaccion.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium truncate">
            {transaccion.descripcion || CATEGORIA_LABEL[categoria] || categoria}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{CATEGORIA_LABEL[categoria] ?? categoria}</span>
            {transaccion.forma_pago && (
              <>
                <span>·</span>
                <span>{FORMA_PAGO_LABEL[transaccion.forma_pago] ?? transaccion.forma_pago}</span>
              </>
            )}
            {tarjetaNombre && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{tarjetaNombre}</span>
              </>
            )}
            <span>·</span>
            <span>{fechaDisplay}</span>
          </div>
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums text-destructive shrink-0">
        -{formatMXN(monto)}
      </span>
    </div>
  )
}
