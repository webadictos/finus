'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearAcuerdoPago } from '@/app/(dashboard)/compromisos/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  compromisoId: string
  compromisoNombre: string
}

export default function AcuerdoPagoForm({ open, onOpenChange, compromisoId, compromisoNombre }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await crearAcuerdoPago(compromisoId, formData)
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold">Acuerdo de pago</Dialog.Title>
              <p className="text-xs text-muted-foreground mt-0.5">{compromisoNombre}</p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monto_acordado">Monto total acordado *</Label>
              <Input
                id="monto_acordado"
                name="monto_acordado"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Monto total negociado a pagar (puede incluir quita o reestructura)
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha_acuerdo">Fecha del acuerdo</Label>
              <Input
                id="fecha_acuerdo"
                name="fecha_acuerdo"
                type="date"
                defaultValue={today}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha_limite">Fecha límite de liquidación *</Label>
              <Input
                id="fecha_limite"
                name="fecha_limite"
                type="date"
                required
              />
              <p className="text-xs text-muted-foreground">
                Fecha máxima para liquidar el monto acordado
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notas">Notas opcionales</Label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                placeholder="Nombre del ejecutivo, condiciones especiales…"
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none dark:bg-input/30"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-auto pt-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Guardando…' : 'Registrar acuerdo'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
