'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmarIngreso } from '@/app/(dashboard)/ingresos/actions'
import { formatMXN } from '@/lib/format'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingresoId: string
  nombre: string
  montoEsperado: number
  esRecurrente: boolean
  frecuencia: string | null
}

export default function ConfirmarModal({
  open,
  onOpenChange,
  ingresoId,
  nombre,
  montoEsperado,
  esRecurrente,
  frecuencia,
}: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [monto, setMonto] = useState(String(montoEsperado))
  const [fecha, setFecha] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMonto(String(montoEsperado))
      setFecha(today)
      setError(null)
      setSuccess(false)
    }
    onOpenChange(next)
  }

  const confirmar = () => {
    const val = parseFloat(monto)
    if (isNaN(val) || val <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }
    if (!fecha) {
      setError('Ingresa la fecha de recepción')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await confirmarIngreso(ingresoId, val, fecha)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => onOpenChange(false), 1200)
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
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Confirmar ingreso
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
              <CheckCircle className="size-10" />
              <p className="font-medium">¡Ingreso confirmado!</p>
              {esRecurrente && frecuencia && (
                <p className="text-xs text-muted-foreground text-center">
                  Se generó la siguiente instancia ({frecuencia})
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Referencia esperado */}
              <p className="mb-4 text-sm text-muted-foreground">
                Esperado: <span className="font-medium text-foreground">{formatMXN(montoEsperado)}</span>
              </p>

              {/* Monto real */}
              <div className="flex flex-col gap-1.5 mb-3">
                <Label htmlFor="monto-real">Monto recibido</Label>
                <Input
                  id="monto-real"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>

              {/* Fecha real */}
              <div className="flex flex-col gap-1.5 mb-4">
                <Label htmlFor="fecha-real">Fecha de recepción</Label>
                <Input
                  id="fecha-real"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              {esRecurrente && frecuencia && (
                <p className="mb-4 rounded-md bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                  Al confirmar se generará automáticamente la siguiente instancia ({frecuencia}).
                </p>
              )}

              {error && (
                <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button className="w-full" onClick={confirmar} disabled={isPending}>
                {isPending ? 'Confirmando...' : 'Confirmar recibido'}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
