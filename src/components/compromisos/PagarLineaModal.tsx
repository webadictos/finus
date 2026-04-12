'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { registrarPagoLinea } from '@/app/(dashboard)/compromisos/actions'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type TipoPagoLinea = 'minimo' | 'sin_intereses' | 'parcial' | 'total'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineaId: string
  nombre: string
  pagoMinimo: number | null
  pagoSinIntereses: number | null
  cuentas: Cuenta[]
}

export default function PagarLineaModal({
  open,
  onOpenChange,
  lineaId,
  nombre,
  pagoMinimo,
  pagoSinIntereses,
  cuentas,
}: Props) {
  const [monto, setMonto] = useState('')
  const [tipoPago, setTipoPago] = useState<TipoPagoLinea>('parcial')
  const [cuentaId, setCuentaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Pre-seleccionar sin intereses si está disponible, sino mínimo
      if (pagoSinIntereses != null && pagoSinIntereses > 0) {
        setMonto(String(pagoSinIntereses))
        setTipoPago('sin_intereses')
      } else if (pagoMinimo != null && pagoMinimo > 0) {
        setMonto(String(pagoMinimo))
        setTipoPago('minimo')
      } else {
        setMonto('')
        setTipoPago('parcial')
      }
      setCuentaId('')
      setError(null)
      setSuccess(false)
    }
    onOpenChange(next)
  }

  const seleccionarOpcion = (montoOpc: number, tipo: TipoPagoLinea) => {
    setMonto(String(montoOpc))
    setTipoPago(tipo)
    setError(null)
  }

  const confirmar = () => {
    const val = parseFloat(monto)
    if (isNaN(val) || val <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }
    setError(null)
    setConfirmOpen(true)
  }

  const ejecutarPago = () => {
    const val = parseFloat(monto)
    startTransition(async () => {
      const result = await registrarPagoLinea(lineaId, val, tipoPago, cuentaId || null)
      setConfirmOpen(false)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => onOpenChange(false), 1200)
      }
    })
  }

  const montoSeleccionado = parseFloat(monto)
  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId)

  const isOpcionActiva = (tipo: TipoPagoLinea, montoOpc: number) =>
    tipoPago === tipo && monto === String(montoOpc)

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
              {/* Opciones rápidas */}
              <div className="flex flex-col gap-1.5 mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Opciones rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  {pagoMinimo != null && pagoMinimo > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => seleccionarOpcion(pagoMinimo, 'minimo')}
                      className={isOpcionActiva('minimo', pagoMinimo) ? 'border-primary text-primary' : ''}
                    >
                      Mínimo — {formatMXN(pagoMinimo)}
                    </Button>
                  )}
                  {pagoSinIntereses != null && pagoSinIntereses > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => seleccionarOpcion(pagoSinIntereses, 'sin_intereses')}
                      className={isOpcionActiva('sin_intereses', pagoSinIntereses) ? 'border-primary text-primary' : ''}
                    >
                      Sin intereses — {formatMXN(pagoSinIntereses)}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTipoPago('parcial')}
                    className={tipoPago === 'parcial' ? 'border-primary text-primary' : ''}
                  >
                    Otro monto
                  </Button>
                </div>
              </div>

              {/* Cuenta origen */}
              {cuentas.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  <Label htmlFor="cuenta-linea">Pagar desde cuenta</Label>
                  <select
                    id="cuenta-linea"
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
                <Label htmlFor="monto-linea">Monto a pagar</Label>
                <Input
                  id="monto-linea"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => {
                    setMonto(e.target.value)
                    setTipoPago('parcial')
                  }}
                />
              </div>

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

              <Button className="w-full" onClick={confirmar}>
                Confirmar pago
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>

      <ConfirmarAccionModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        titulo="¿Registrar pago?"
        descripcion={(() => {
          const val = isNaN(montoSeleccionado) ? 0 : montoSeleccionado
          const montoStr = formatMXN(val)
          return cuentaSeleccionada
            ? `¿Registrar pago de ${montoStr} para "${nombre}"? Se descontará del saldo de ${cuentaSeleccionada.nombre}.`
            : `¿Registrar pago de ${montoStr} para "${nombre}"? Solo queda registrado, sin descontar de cuenta.`
        })()}
        labelConfirmar="Registrar pago"
        onConfirm={ejecutarPago}
        loading={isPending}
      />
    </Dialog.Root>
  )
}
