'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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
import { formatFecha, formatMXN } from '@/lib/format'
import { getGastoCategoriaLabel } from '@/lib/gasto-categorias'
import { parseTags, type TagItem } from '@/lib/tags'
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

const SUBCATEGORIA_LABEL: Record<string, string> = {
  restaurante: 'Restaurante',
  cocina_propia: 'Cocina propia',
  antojo: 'Antojo',
  delivery: 'Delivery',
  lleno: 'Lleno',
  emergencia: 'Emergencia',
}

const MOMENTO_DEL_DIA_LABEL: Record<string, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack',
  sin_clasificar: 'Sin clasificar',
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
  etiquetasSugeridas?: TagItem[]
}

export default function GastoCard({ transaccion, tarjetaNombre, cuentas, tarjetas, etiquetasSugeridas = [] }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isMobile, setIsMobile] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const startXRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const SWIPE_ACTION_WIDTH = 112

  const monto = Number(transaccion.monto ?? 0)
  const categoria = transaccion.categoria ?? 'otro'
  const Icon = CATEGORIA_ICONS[categoria] ?? Tag
  const fechaDisplay = formatFecha(transaccion.fecha)

  const handleEliminar = () => {
    startTransition(async () => {
      await eliminarGasto(transaccion.id)
      setDeleteOpen(false)
    })
  }

  const descripcionLabel = transaccion.descripcion || getGastoCategoriaLabel(categoria) || categoria
  const etiquetas = parseTags(transaccion.etiquetas)
  const metadata = [
    getGastoCategoriaLabel(categoria) ?? categoria,
    transaccion.subcategoria
      ? (SUBCATEGORIA_LABEL[transaccion.subcategoria] ?? transaccion.subcategoria)
      : null,
    transaccion.momento_del_dia
      ? (MOMENTO_DEL_DIA_LABEL[transaccion.momento_del_dia] ?? transaccion.momento_del_dia)
      : null,
    transaccion.forma_pago
      ? (FORMA_PAGO_LABEL[transaccion.forma_pago] ?? transaccion.forma_pago)
      : null,
    tarjetaNombre ?? null,
  ].filter(Boolean) as string[]

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(pointer: coarse) and (max-width: 767px)')
    const apply = () => setIsMobile(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  const handlePointerDown = (clientX: number) => {
    if (!isMobile) return
    startXRef.current = clientX
    draggingRef.current = true
  }

  const handlePointerMove = (clientX: number) => {
    if (!isMobile || !draggingRef.current || startXRef.current == null) return
    const delta = clientX - startXRef.current
    if (delta > 24) {
      setSwipeOffset(0)
      return
    }
    setSwipeOffset(Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, delta)))
  }

  const handlePointerEnd = () => {
    if (!isMobile || !draggingRef.current) return
    draggingRef.current = false
    startXRef.current = null
    setSwipeOffset((current) => (Math.abs(current) > SWIPE_ACTION_WIDTH / 2 ? -SWIPE_ACTION_WIDTH : 0))
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border bg-card">
        {isMobile && (
          <div className="absolute inset-y-0 right-0 flex w-28 items-stretch">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex flex-1 flex-col items-center justify-center gap-1 bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <Pencil className="size-4" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Editar</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive/90 text-destructive-foreground transition-colors hover:bg-destructive"
            >
              <Trash2 className="size-4" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Borrar</span>
            </button>
          </div>
        )}

        <div
          className="relative bg-card transition-transform duration-200 ease-out"
          style={{ transform: isMobile ? `translateX(${swipeOffset}px)` : undefined }}
          onTouchStart={(event) => handlePointerDown(event.touches[0]?.clientX ?? 0)}
          onTouchMove={(event) => handlePointerMove(event.touches[0]?.clientX ?? 0)}
          onTouchEnd={handlePointerEnd}
          onTouchCancel={handlePointerEnd}
        >
          <div className="flex items-start gap-3 px-4 py-3.5 md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted md:mt-0">
                <Icon className="size-4 text-muted-foreground" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold md:text-[15px]">
                      {descripcionLabel}
                    </span>
                    <p className="mt-0.5 text-[11px] text-muted-foreground md:hidden">
                      Desliza para editar o borrar
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-destructive md:text-[15px]">
                      -{formatMXN(monto)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {fechaDisplay}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {metadata.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground md:text-[11px]"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {etiquetas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {etiquetas.map((tag) => (
                      <span
                        key={tag.slug}
                        className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary md:text-[11px]"
                        title={tag.slug}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ml-2 hidden shrink-0 items-center gap-1 md:flex">
              <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <RegistrarGastoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        cuentas={cuentas}
        tarjetas={tarjetas}
        etiquetasSugeridas={etiquetasSugeridas}
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
