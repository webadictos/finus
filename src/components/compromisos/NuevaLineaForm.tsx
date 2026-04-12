'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearLineaCredito } from '@/app/(dashboard)/compromisos/actions'

type TipoLinea = 'tarjeta_credito' | 'linea_digital' | 'bnpl' | 'departamental'
type TitularTipo = 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'

const TIPO_LINEA_LABEL: Record<TipoLinea, string> = {
  tarjeta_credito: 'Tarjeta de crédito',
  linea_digital: 'Línea digital',
  bnpl: 'BNPL',
  departamental: 'Departamental',
}

const TITULAR_TIPO_LABEL: Record<TitularTipo, string> = {
  personal: 'Personal',
  pareja: 'Pareja',
  familiar: 'Familiar',
  empresa: 'Empresa',
  tercero: 'Tercero',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NuevaLineaForm({ open, onOpenChange }: Props) {
  const [titularTipo, setTitularTipo] = useState<TitularTipo>('personal')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTitularTipo('personal')
      setError(null)
    }
    onOpenChange(next)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await crearLineaCredito(fd)
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
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Nueva línea de crédito
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
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="ej. Liverpool Tania"
                required
              />
            </div>

            {/* Banco */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="banco">Banco o emisor</Label>
              <Input
                id="banco"
                name="banco"
                placeholder="ej. Liverpool"
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                defaultValue="tarjeta_credito"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
              >
                {(Object.keys(TIPO_LINEA_LABEL) as TipoLinea[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LINEA_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Titular */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="titular_tipo">Titular</Label>
              <select
                id="titular_tipo"
                name="titular_tipo"
                value={titularTipo}
                onChange={(e) => setTitularTipo(e.target.value as TitularTipo)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
              >
                {(Object.keys(TITULAR_TIPO_LABEL) as TitularTipo[]).map((t) => (
                  <option key={t} value={t}>
                    {TITULAR_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>

            {titularTipo !== 'personal' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="titular_nombre">Nombre del titular</Label>
                <Input
                  id="titular_nombre"
                  name="titular_nombre"
                  placeholder="ej. Tania"
                />
              </div>
            )}

            {/* Últimos 4 dígitos */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ultimos_4">
                Últimos 4 dígitos
                <span className="ml-1 text-xs font-normal text-muted-foreground">— opcional</span>
              </Label>
              <Input
                id="ultimos_4"
                name="ultimos_4"
                placeholder="1234"
                maxLength={4}
              />
            </div>

            {/* Límite de crédito */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="limite_credito">Límite de crédito</Label>
              <Input
                id="limite_credito"
                name="limite_credito"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="border-t pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Estado de cuenta actual
              </p>
              <div className="flex flex-col gap-5">
                {/* Saldo al corte */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="saldo_al_corte">Saldo al corte</Label>
                  <Input
                    id="saldo_al_corte"
                    name="saldo_al_corte"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                {/* Pago sin intereses */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pago_sin_intereses">Pago para no generar intereses</Label>
                  <Input
                    id="pago_sin_intereses"
                    name="pago_sin_intereses"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                {/* Pago mínimo */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pago_minimo">Pago mínimo</Label>
                  <Input
                    id="pago_minimo"
                    name="pago_minimo"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Fechas de ciclo
              </p>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="dia_corte">Día de corte</Label>
                  <Input
                    id="dia_corte"
                    name="dia_corte"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="20"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="dia_limite_pago">Día límite de pago</Label>
                  <Input
                    id="dia_limite_pago"
                    name="dia_limite_pago"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="13"
                  />
                </div>
              </div>
            </div>

            {/* Tasa de interés */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tasa_interes_anual">
                Tasa de interés anual (%)
                <span className="ml-1 text-xs font-normal text-muted-foreground">— opcional</span>
              </Label>
              <Input
                id="tasa_interes_anual"
                name="tasa_interes_anual"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>

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
                {isPending ? 'Guardando...' : 'Crear línea'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
