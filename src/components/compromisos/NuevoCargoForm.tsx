'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearCargoLinea } from '@/app/(dashboard)/compromisos/actions'

type TipoCargo = 'revolvente' | 'msi' | 'disposicion_efectivo'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineaId: string
  lineaNombre: string
}

const TIPO_LABEL: Record<TipoCargo, string> = {
  revolvente: 'Revolvente',
  msi: 'Meses sin intereses (MSI)',
  disposicion_efectivo: 'Disposición en efectivo',
}

export default function NuevoCargoForm({ open, onOpenChange, lineaId, lineaNombre }: Props) {
  const [tipo, setTipo] = useState<TipoCargo>('revolvente')
  const [montoOriginal, setMontoOriginal] = useState('')
  const [mensualidades, setMensualidades] = useState('')
  const [mensualidad, setMensualidad] = useState('')
  const [mensualidadEditada, setMensualidadEditada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTipo('revolvente')
      setMontoOriginal('')
      setMensualidades('')
      setMensualidad('')
      setMensualidadEditada(false)
      setError(null)
    }
    onOpenChange(next)
  }

  // Auto-calcular mensualidad cuando cambia monto_original o mensualidades_totales
  const recalcularMensualidad = (monto: string, meses: string) => {
    if (mensualidadEditada) return
    const m = parseFloat(monto)
    const n = parseInt(meses)
    if (!isNaN(m) && m > 0 && !isNaN(n) && n > 0) {
      setMensualidad(String(Math.ceil((m / n) * 100) / 100))
    }
  }

  const handleMontoChange = (val: string) => {
    setMontoOriginal(val)
    recalcularMensualidad(val, mensualidades)
  }

  const handleMesesChange = (val: string) => {
    setMensualidades(val)
    recalcularMensualidad(montoOriginal, val)
  }

  const handleMensualidadChange = (val: string) => {
    setMensualidad(val)
    setMensualidadEditada(true)
  }

  const handleTipoChange = (val: TipoCargo) => {
    setTipo(val)
    setMensualidades('')
    setMensualidad('')
    setMensualidadEditada(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await crearCargoLinea(lineaId, fd)
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  const tieneInstalamentos = tipo === 'msi' || tipo === 'disposicion_efectivo'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Agregar cargo
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                {lineaNombre}
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto px-5 py-5 flex-1">
            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Descripción del cargo</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="ej. Amazon Prime 12 meses"
                required
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => handleTipoChange(e.target.value as TipoCargo)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
              >
                {(Object.keys(TIPO_LABEL) as TipoCargo[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
              {tipo === 'disposicion_efectivo' && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Genera intereses desde el día 1 — liquida urgente.
                </p>
              )}
            </div>

            {/* Monto original */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monto_original">
                {tipo === 'revolvente' ? 'Saldo pendiente actual' : 'Monto total del cargo'}
              </Label>
              <Input
                id="monto_original"
                name="monto_original"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={montoOriginal}
                onChange={(e) => handleMontoChange(e.target.value)}
                required
              />
            </div>

            {/* Campos de instalamentos — MSI y disposicion_efectivo */}
            {tieneInstalamentos && (
              <>
                <div className="flex gap-3">
                  {/* Mensualidades totales */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Label htmlFor="mensualidades_totales">Meses totales</Label>
                    <Input
                      id="mensualidades_totales"
                      name="mensualidades_totales"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="12"
                      value={mensualidades}
                      onChange={(e) => handleMesesChange(e.target.value)}
                    />
                  </div>

                  {/* Mensualidad */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Label htmlFor="monto_mensualidad">
                      Pago mensual
                      {!mensualidadEditada && mensualidad && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (calculado)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="monto_mensualidad"
                      name="monto_mensualidad"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={mensualidad}
                      onChange={(e) => handleMensualidadChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Tasa efectiva anual */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tasa_efectiva_anual">
                    Tasa efectiva anual (%)
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      — 0 si es sin intereses
                    </span>
                  </Label>
                  <Input
                    id="tasa_efectiva_anual"
                    name="tasa_efectiva_anual"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    defaultValue="0"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="mt-auto flex gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="flex-1" disabled={isPending}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Agregar cargo'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
