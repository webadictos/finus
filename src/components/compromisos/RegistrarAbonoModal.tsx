'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrarAbono } from '@/app/(dashboard)/compromisos/actions'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  acuerdoId: string
  compromisoId: string
  compromisoNombre: string
  montoPendiente: number
  cuentas: Cuenta[]
}

export default function RegistrarAbonoModal({
  open,
  onOpenChange,
  acuerdoId,
  compromisoId,
  compromisoNombre,
  montoPendiente,
  cuentas,
}: Props) {
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30'

  const handleConfirm = () => {
    const val = parseFloat(monto)
    if (isNaN(val) || val <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await registrarAbono(acuerdoId, compromisoId, val, cuentaId || null)
      if (result.error) {
        setError(result.error)
      } else {
        setMonto('')
        setCuentaId('')
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Registrar abono
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                {compromisoNombre}
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Pendiente:{' '}
            <span className="font-semibold text-foreground">{formatMXN(montoPendiente)}</span>
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="abono-monto">Monto del abono</Label>
              <Input
                id="abono-monto"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="abono-cuenta">Cuenta de débito (opcional)</Label>
              <select
                id="abono-cuenta"
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className={selectClass}
              >
                <option value="">— Sin descontar de cuenta —</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button onClick={handleConfirm} disabled={isPending} className="w-full">
              {isPending ? 'Registrando…' : 'Registrar abono'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
