'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RecomendacionBadge from '@/components/compromisos/RecomendacionBadge'
import { marcarPagado } from '@/app/(dashboard)/compromisos/actions'
import { formatMXN } from '@/lib/format'
import type { Recomendacion } from '@/types/finus'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  compromisoId: string
  nombre: string
  montoPrincipal: number
  pagoSinIntereses: number | null
  pagoMinimo: number | null
  esRevolvente: boolean
  recomendacion: Recomendacion
  cuentas: Cuenta[]
  onSuccess?: (data: {
    transaccionId: string
    fechaAnterior: string | null
    cuentaId: string | null
    monto: number
  }) => void
}

export default function PagarModal({
  open,
  onOpenChange,
  compromisoId,
  nombre,
  montoPrincipal,
  pagoSinIntereses,
  pagoMinimo,
  esRevolvente,
  recomendacion,
  cuentas,
  onSuccess,
}: Props) {
  const [monto, setMonto] = useState(String(montoPrincipal))
  const [cuentaId, setCuentaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMonto(String(montoPrincipal))
      setCuentaId('')
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
    setError(null)

    startTransition(async () => {
      const result = await marcarPagado(compromisoId, val, cuentaId || null)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        if (result.transaccionId) {
          onSuccess?.({
            transaccionId: result.transaccionId,
            fechaAnterior: result.fechaAnterior ?? null,
            cuentaId: result.cuentaId ?? null,
            monto: val,
          })
        }
        setTimeout(() => onOpenChange(false), 1200)
      }
    })
  }

  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId)

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
              Registrar pago
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
              <p className="font-medium">¡Pago registrado!</p>
            </div>
          ) : (
            <>
              {/* Recomendación */}
              <RecomendacionBadge recomendacion={recomendacion} className="mb-4" />

              {/* Opciones rápidas */}
              <div className="mb-4 flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Opciones rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMonto(String(montoPrincipal))}
                    className={monto === String(montoPrincipal) ? 'border-primary text-primary' : ''}
                  >
                    Completo — {formatMXN(montoPrincipal)}
                  </Button>

                  {esRevolvente && pagoSinIntereses != null && pagoSinIntereses > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMonto(String(pagoSinIntereses))}
                      className={
                        monto === String(pagoSinIntereses) ? 'border-primary text-primary' : ''
                      }
                    >
                      Sin intereses — {formatMXN(pagoSinIntereses)}
                    </Button>
                  )}

                  {pagoMinimo != null && pagoMinimo > 0 && pagoMinimo !== montoPrincipal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMonto(String(pagoMinimo))}
                      className={monto === String(pagoMinimo) ? 'border-primary text-primary' : ''}
                    >
                      Mínimo — {formatMXN(pagoMinimo)}
                    </Button>
                  )}
                </div>
              </div>

              {/* Cuenta de débito */}
              {cuentas.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  <Label htmlFor="cuenta-pago">Pagar desde cuenta</Label>
                  <select
                    id="cuenta-pago"
                    value={cuentaId}
                    onChange={(e) => setCuentaId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                  >
                    <option value="">— Sin descontar de cuenta —</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Monto personalizado */}
              <div className="flex flex-col gap-1.5 mb-4">
                <Label htmlFor="monto-pago">Monto a registrar</Label>
                <Input
                  id="monto-pago"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>

              {/* Impacto en saldo */}
              <p className="mb-4 text-xs text-muted-foreground">
                {cuentaSeleccionada
                  ? `Se descontará de: ${cuentaSeleccionada.nombre}`
                  : 'No descontará de ninguna cuenta — solo queda registrado.'}
              </p>

              {error && (
                <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                onClick={confirmar}
                disabled={isPending}
              >
                {isPending ? 'Registrando...' : 'Confirmar pago'}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
