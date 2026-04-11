'use client'

import { useState, useTransition } from 'react'
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
  Home,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import RegistrarGastoForm from '@/components/gastos/RegistrarGastoForm'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { eliminarGasto } from '@/app/(dashboard)/gastos/actions'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Transaccion = Database['public']['Tables']['transacciones']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

const CATEGORIA_ICONS: Record<string, LucideIcon> = {
  comida: UtensilsCrossed,
  gasolina: Fuel,
  despensa: ShoppingCart,
  casa: Home,
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
  casa: 'Casa',
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
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
}

export default function GastoCard({ transaccion, tarjetaNombre, cuentas, tarjetas }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const monto = Number(transaccion.monto ?? 0)
  const categoria = transaccion.categoria ?? 'otro'
  const Icon = CATEGORIA_ICONS[categoria] ?? Tag
  const fechaDisplay = new Date(transaccion.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })

  const handleEliminar = () => {
    startTransition(async () => {
      await eliminarGasto(transaccion.id)
      setDeleteOpen(false)
    })
  }

  const descripcionLabel =
    transaccion.descripcion || CATEGORIA_LABEL[categoria] || categoria

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium truncate">{descripcionLabel}</span>
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

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-semibold tabular-nums text-destructive">
            -{formatMXN(monto)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      <RegistrarGastoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        cuentas={cuentas}
        tarjetas={tarjetas}
        transaccion={transaccion}
      />

      <ConfirmarAccionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo="Eliminar gasto"
        descripcion={`¿Eliminar "${descripcionLabel}" por ${formatMXN(monto)}? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        variante="destructive"
        onConfirm={handleEliminar}
        loading={isPending}
      />
    </>
  )
}
