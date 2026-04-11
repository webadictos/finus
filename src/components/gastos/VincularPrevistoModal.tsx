'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { vincularGastoPrevisto } from '@/app/(dashboard)/proyeccion/actions'
import { formatMXN } from '@/lib/format'
import type { PrevistoBasico } from '@/app/(dashboard)/gastos/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaccionId: string
  previstos: PrevistoBasico[]
}

export default function VincularPrevistoModal({
  open,
  onOpenChange,
  transaccionId,
  previstos,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelectedId(null)
      setSuccess(false)
      setError(null)
    }
    onOpenChange(next)
  }

  const vincular = () => {
    if (!selectedId) return
    setError(null)

    startTransition(async () => {
      const result = await vincularGastoPrevisto(selectedId, transaccionId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onOpenChange(false)
        }, 1000)
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <Dialog.Title className="text-base font-semibold leading-tight">
              ¿Corresponde a un gasto previsto?
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
              <p className="font-medium text-sm">Gasto previsto vinculado</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona el gasto previsto al que corresponde este registro para marcarlo como realizado.
              </p>

              <div className="flex flex-col gap-2 mb-4">
                {previstos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      selectedId === p.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className={`size-3.5 shrink-0 ${selectedId === p.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium truncate">{p.nombre}</span>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground shrink-0">
                      {formatMXN(p.monto_estimado)}
                    </span>
                  </button>
                ))}
              </div>

              {error && (
                <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline" className="flex-1">
                    No corresponde
                  </Button>
                </Dialog.Close>
                <Button
                  className="flex-1"
                  onClick={vincular}
                  disabled={!selectedId || isPending}
                >
                  {isPending ? 'Vinculando...' : 'Vincular'}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
