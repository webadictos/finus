'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmarFechaGasto } from '@/app/(dashboard)/proyeccion/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  gastoId: string
  nombre: string
  fechaSugerida: string | null
}

export default function ConfirmarFechaModal({
  open,
  onOpenChange,
  gastoId,
  nombre,
  fechaSugerida,
}: Props) {
  const [fecha, setFecha] = useState(
    fechaSugerida ?? new Date().toISOString().split('T')[0]
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setFecha(fechaSugerida ?? new Date().toISOString().split('T')[0])
      setError(null)
      setSuccess(false)
    }
    onOpenChange(next)
  }

  const confirmar = () => {
    if (!fecha) {
      setError('Selecciona una fecha')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await confirmarFechaGasto(gastoId, fecha)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => onOpenChange(false), 1000)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Confirmar fecha
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                {nombre}
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-6 text-emerald-600">
              <CheckCircle className="size-8" />
              <p className="font-medium text-sm">Fecha confirmada</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-4">
                <Label htmlFor="fecha-confirmada">Fecha confirmada</Label>
                <Input
                  id="fecha-confirmada"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              {error && (
                <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button className="w-full" onClick={confirmar} disabled={isPending}>
                {isPending ? 'Guardando...' : 'Confirmar fecha'}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
