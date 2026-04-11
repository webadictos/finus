'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmarGastoPrevisto } from '@/app/(dashboard)/proyeccion/actions'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

const FORMA_PAGO_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito_revolvente', label: 'Crédito revolvente' },
  { value: 'msi', label: 'MSI' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  gastoId: string
  nombre: string
  montoEstimado: number
  certeza: 'alta' | 'media' | 'baja'
  cuentas: Cuenta[]
}

export default function MarcarRealizadoModal({
  open,
  onOpenChange,
  gastoId,
  nombre,
  montoEstimado,
  certeza,
  cuentas,
}: Props) {
  const [montoReal, setMontoReal] = useState('')
  const [formaPago, setFormaPago] = useState('efectivo')
  const [cuentaId, setCuentaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const esVariable = certeza === 'media' || certeza === 'baja'
  const needsCuenta = formaPago === 'efectivo' || formaPago === 'debito'

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMontoReal('')
      setFormaPago('efectivo')
      setCuentaId('')
      setError(null)
      setSuccess(false)
    }
    onOpenChange(next)
  }

  const confirmar = () => {
    if (needsCuenta && !cuentaId) {
      setError('Selecciona la cuenta de donde se pagó')
      return
    }
    setError(null)

    const montoFinal = montoReal !== '' ? parseFloat(montoReal) : 0

    startTransition(async () => {
      const result = await confirmarGastoPrevisto(
        gastoId,
        montoFinal,
        needsCuenta ? cuentaId : null,
        formaPago
      )
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

  const selectClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30'

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
              Marcar como realizado
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
              <p className="font-medium text-sm">Gasto registrado</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-4">
                {esVariable ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mr-monto">
                      Monto real{' '}
                      <span className="font-normal text-muted-foreground">
                        (estimado: {formatMXN(montoEstimado)})
                      </span>
                    </Label>
                    <Input
                      id="mr-monto"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={String(montoEstimado)}
                      value={montoReal}
                      onChange={(e) => setMontoReal(e.target.value)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-md bg-muted px-3 py-2">
                    Se registrará {formatMXN(montoEstimado)} como gasto
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mr-fp">Forma de pago</Label>
                  <select
                    id="mr-fp"
                    value={formaPago}
                    onChange={(e) => {
                      setFormaPago(e.target.value)
                      setCuentaId('')
                    }}
                    className={selectClass}
                  >
                    {FORMA_PAGO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {needsCuenta && cuentas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mr-cuenta">Cuenta</Label>
                    <select
                      id="mr-cuenta"
                      value={cuentaId}
                      onChange={(e) => setCuentaId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Selecciona cuenta —</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button className="w-full" onClick={confirmar} disabled={isPending}>
                {isPending ? 'Registrando...' : 'Confirmar gasto realizado'}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
