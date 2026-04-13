'use client'

import { useRef, useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearPartida, actualizarPartida } from '@/app/(dashboard)/presupuesto/actions'
import type { Database } from '@/types/database'

type Partida = Database['public']['Tables']['presupuesto_operativo']['Row']

const CATEGORIAS = [
  { value: 'comida', label: 'Comida' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'despensa', label: 'Despensa' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'salud', label: 'Salud' },
  { value: 'varios', label: 'Varios' },
]

const FRECUENCIAS = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  partida?: Partida | null
}

export default function PartidaForm({ open, onOpenChange, partida }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const isEdit = !!partida
  const formKey = partida?.id ?? 'new'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await actualizarPartida(partida.id, fd)
        : await crearPartida(fd)

      if (result.error) {
        setError(result.error)
        return
      }
      onOpenChange(false)
      formRef.current?.reset()
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <Dialog.Content
          key={formKey}
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold">
                {isEdit ? 'Editar partida' : 'Nueva partida'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {isEdit
                  ? 'Actualiza la categoria, frecuencia y monto de esta partida operativa.'
                  : 'Define una categoria, frecuencia y monto para tu reserva operativa.'}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {/* Categoría */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              <select
                id="categoria"
                name="categoria"
                defaultValue={partida?.categoria ?? 'comida'}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Subcategoría (opcional) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subcategoria">
                Subcategoría <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="subcategoria"
                name="subcategoria"
                placeholder="Ej: restaurante, cocina_propia, café"
                defaultValue={partida?.subcategoria ?? ''}
              />
            </div>

            {/* Frecuencia */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="frecuencia">Frecuencia</Label>
              <select
                id="frecuencia"
                name="frecuencia"
                defaultValue={partida?.frecuencia ?? 'semanal'}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {FRECUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monto_manual">Monto estimado</Label>
              <Input
                id="monto_manual"
                name="monto_manual"
                type="number"
                min="0"
                step="1"
                required
                placeholder="0"
                defaultValue={partida?.monto_manual != null ? String(partida.monto_manual) : ''}
              />
              <p className="text-xs text-muted-foreground">
                Cuánto gastas en esta categoría por período
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="mt-auto pt-4 border-t flex gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar partida'}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
