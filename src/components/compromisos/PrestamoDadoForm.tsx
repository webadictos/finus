'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMXN } from '@/lib/format'
import { registrarPrestamoDado } from '@/app/(dashboard)/compromisos/actions'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cuentas: Cuenta[]
}

export default function PrestamoDadoForm({ open, onOpenChange, cuentas }: Props) {
  const [deudor, setDeudor] = useState('')
  const [montoPrestado, setMontoPrestado] = useState('')
  const [montoARecuperar, setMontoARecuperar] = useState('')
  const [fechaDevolucion, setFechaDevolucion] = useState('')
  const [cuentaOrigenId, setCuentaOrigenId] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDeudor('')
      setMontoPrestado('')
      setMontoARecuperar('')
      setFechaDevolucion('')
      setCuentaOrigenId('')
      setNotas('')
      setError(null)
    }
    onOpenChange(next)
  }

  const montoPrestadoNum = parseFloat(montoPrestado)
  const montoRecuperarNum = parseFloat(montoARecuperar)
  const interesImplicito =
    !isNaN(montoPrestadoNum) &&
    !isNaN(montoRecuperarNum) &&
    montoRecuperarNum > montoPrestadoNum
      ? montoRecuperarNum - montoPrestadoNum
      : null
  const pctInteres =
    interesImplicito != null && montoPrestadoNum > 0
      ? (interesImplicito / montoPrestadoNum) * 100
      : null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await registrarPrestamoDado(fd)
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Registrar préstamo dado
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto px-5 py-5 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deudor">¿A quién le prestas?</Label>
              <Input
                id="deudor"
                name="deudor"
                placeholder="ej. hermano, amigo Luis"
                value={deudor}
                onChange={(e) => setDeudor(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monto_prestado">¿Cuánto le prestas?</Label>
              <Input
                id="monto_prestado"
                name="monto_prestado"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={montoPrestado}
                onChange={(e) => {
                  setMontoPrestado(e.target.value)
                  if (!montoARecuperar) setMontoARecuperar(e.target.value)
                }}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monto_a_recuperar">¿Cuánto vas a recuperar?</Label>
              <Input
                id="monto_a_recuperar"
                name="monto_a_recuperar"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={montoARecuperar}
                onChange={(e) => setMontoARecuperar(e.target.value)}
              />
              {interesImplicito != null && pctInteres != null && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Interés implícito: {formatMXN(interesImplicito)} ({pctInteres.toFixed(1)}%)
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha_devolucion">
                Fecha de devolución esperada
                <span className="ml-1 text-xs font-normal text-muted-foreground">— opcional</span>
              </Label>
              <Input
                id="fecha_devolucion"
                name="fecha_devolucion"
                type="date"
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
              />
            </div>

            {cuentas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cuenta_origen_id">¿De qué cuenta sale?</Label>
                <select
                  id="cuenta_origen_id"
                  name="cuenta_origen_id"
                  value={cuentaOrigenId}
                  onChange={(e) => setCuentaOrigenId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                >
                  <option value="">— Solo registrar, sin descontar —</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notas">
                Notas
                <span className="ml-1 text-xs font-normal text-muted-foreground">— opcional</span>
              </Label>
              <Input
                id="notas"
                name="notas"
                placeholder="ej. para el negocio"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-auto flex gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="flex-1" disabled={isPending}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
