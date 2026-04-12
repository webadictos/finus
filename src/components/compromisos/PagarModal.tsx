'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RecomendacionBadge from '@/components/compromisos/RecomendacionBadge'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { marcarPagado, pagarDesdePrestamo } from '@/app/(dashboard)/compromisos/actions'
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
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Estado del modo préstamo
  const [modoPrestamo, setModoPrestamo] = useState(false)
  const [prestamista, setPrestamista] = useState('')
  const [montoPrestamo, setMontoPrestamo] = useState(String(montoPrincipal))
  const [fechaDevolucion, setFechaDevolucion] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMonto(String(montoPrincipal))
      setCuentaId('')
      setError(null)
      setSuccess(false)
      setModoPrestamo(false)
      setPrestamista('')
      setMontoPrestamo(String(montoPrincipal))
      setFechaDevolucion('')
    }
    onOpenChange(next)
  }

  // Paso 1: validar y abrir modal de confirmación
  const confirmar = () => {
    if (modoPrestamo) {
      if (!prestamista.trim()) {
        setError('Indica quién te presta')
        return
      }
      const val = parseFloat(montoPrestamo)
      if (isNaN(val) || val <= 0) {
        setError('Ingresa un monto válido mayor a 0')
        return
      }
      if (!fechaDevolucion) {
        setError('Indica la fecha de devolución')
        return
      }
    } else {
      const val = parseFloat(monto)
      if (isNaN(val) || val <= 0) {
        setError('Ingresa un monto válido mayor a 0')
        return
      }
    }
    setError(null)
    setConfirmOpen(true)
  }

  // Paso 2: ejecutar la acción tras confirmación
  const ejecutarPago = () => {
    if (modoPrestamo) {
      const val = parseFloat(montoPrestamo)
      startTransition(async () => {
        const result = await pagarDesdePrestamo(
          compromisoId,
          prestamista.trim(),
          val,
          fechaDevolucion
        )
        setConfirmOpen(false)
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess(true)
          if (result.transaccionId) {
            onSuccess?.({
              transaccionId: result.transaccionId,
              fechaAnterior: result.fechaAnterior ?? null,
              cuentaId: null,
              monto: val,
            })
          }
          setTimeout(() => onOpenChange(false), 1200)
        }
      })
    } else {
      const val = parseFloat(monto)
      startTransition(async () => {
        const result = await marcarPagado(compromisoId, val, cuentaId || null)
        setConfirmOpen(false)
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
  }

  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId)

  const confirmDesc = modoPrestamo
    ? `¿Marcar "${nombre}" como pagado y crear devolución a ${prestamista || '...'} por ${formatMXN(parseFloat(montoPrestamo) || 0)} para el ${fechaDevolucion || '...'} ?`
    : (() => {
        const val = parseFloat(monto)
        const montoStr = formatMXN(isNaN(val) ? 0 : val)
        return cuentaSeleccionada
          ? `¿Marcar "${nombre}" como pagado por ${montoStr}? Esto se descontará del saldo de ${cuentaSeleccionada.nombre}.`
          : `¿Marcar "${nombre}" como pagado por ${montoStr}? No se descontará de ninguna cuenta — solo queda registrado.`
      })()

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
                    onClick={() => { setMonto(String(montoPrincipal)); setModoPrestamo(false) }}
                    className={!modoPrestamo && monto === String(montoPrincipal) ? 'border-primary text-primary' : ''}
                  >
                    Completo — {formatMXN(montoPrincipal)}
                  </Button>

                  {esRevolvente && pagoSinIntereses != null && pagoSinIntereses > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setMonto(String(pagoSinIntereses)); setModoPrestamo(false) }}
                      className={
                        !modoPrestamo && monto === String(pagoSinIntereses) ? 'border-primary text-primary' : ''
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
                      onClick={() => { setMonto(String(pagoMinimo)); setModoPrestamo(false) }}
                      className={!modoPrestamo && monto === String(pagoMinimo) ? 'border-primary text-primary' : ''}
                    >
                      Mínimo — {formatMXN(pagoMinimo)}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setModoPrestamo(true); setMontoPrestamo(String(montoPrincipal)) }}
                    className={modoPrestamo ? 'border-primary text-primary' : ''}
                  >
                    Pagar desde préstamo
                  </Button>
                </div>
              </div>

              {/* Subformulario inline: modo préstamo */}
              {modoPrestamo ? (
                <div className="flex flex-col gap-3 mb-4 rounded-lg border bg-muted/30 px-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prestamista">¿Quién te presta?</Label>
                    <Input
                      id="prestamista"
                      placeholder="ej. hermana, mamá"
                      value={prestamista}
                      onChange={(e) => setPrestamista(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="monto-prestamo">Monto del préstamo</Label>
                    <Input
                      id="monto-prestamo"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={montoPrestamo}
                      onChange={(e) => setMontoPrestamo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Puede ser más de lo que necesitas
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fecha-devolucion">¿Para cuándo lo devuelves?</Label>
                    <Input
                      id="fecha-devolucion"
                      type="date"
                      value={fechaDevolucion}
                      onChange={(e) => setFechaDevolucion(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}

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

      {/* Modal de confirmación */}
      <ConfirmarAccionModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        titulo="¿Registrar pago?"
        descripcion={confirmDesc}
        labelConfirmar="Registrar pago"
        onConfirm={ejecutarPago}
        loading={isPending}
      />
    </Dialog.Root>
  )
}
