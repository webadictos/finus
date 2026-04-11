'use client'

import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descripcion: string
  labelConfirmar?: string
  variante?: 'default' | 'destructive'
  onConfirm: () => void
  loading?: boolean
}

export default function ConfirmarAccionModal({
  open,
  onOpenChange,
  titulo,
  descripcion,
  labelConfirmar = 'Confirmar',
  variante = 'default',
  onConfirm,
  loading = false,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
          aria-describedby="confirmar-desc"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <Dialog.Title className="text-base font-semibold leading-tight">
              {titulo}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0" disabled={loading}>
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Descripción */}
          <Dialog.Description
            id="confirmar-desc"
            className="text-sm text-muted-foreground leading-relaxed mb-5"
          >
            {descripcion}
          </Dialog.Description>

          {/* Acciones */}
          <div className="flex gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" className="flex-1" disabled={loading}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button
              variant={variante === 'destructive' ? 'destructive' : 'default'}
              className="flex-1"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Procesando...' : labelConfirmar}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
