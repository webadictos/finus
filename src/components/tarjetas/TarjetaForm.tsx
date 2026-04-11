'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearTarjeta, actualizarTarjeta } from '@/app/(dashboard)/tarjetas/actions'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

const TIPO_OPTIONS = [
  { value: 'credito', label: 'Crédito' },
  { value: 'departamental', label: 'Departamental' },
]

const TITULAR_TIPO_OPTIONS = [
  { value: 'personal', label: 'Personal' },
  { value: 'pareja', label: 'Pareja' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'tercero', label: 'Tercero' },
]

interface FormState {
  nombre: string
  banco: string
  tipo: string
  titular_tipo: string
  titular_nombre: string
  ultimos_4: string
  limite_credito: string
  dia_corte: string
  dia_limite_pago: string
}

function initialForm(t?: Tarjeta | null): FormState {
  if (!t) {
    return {
      nombre: '',
      banco: '',
      tipo: 'credito',
      titular_tipo: 'personal',
      titular_nombre: '',
      ultimos_4: '',
      limite_credito: '',
      dia_corte: '',
      dia_limite_pago: '',
    }
  }
  return {
    nombre: t.nombre,
    banco: t.banco,
    tipo: t.tipo,
    titular_tipo: t.titular_tipo,
    titular_nombre: t.titular_nombre ?? '',
    ultimos_4: t.ultimos_4 ?? '',
    limite_credito: t.limite_credito ? String(Number(t.limite_credito)) : '',
    dia_corte: t.dia_corte != null ? String(t.dia_corte) : '',
    dia_limite_pago: t.dia_limite_pago != null ? String(t.dia_limite_pago) : '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tarjeta?: Tarjeta | null
}

export default function TarjetaForm({ open, onOpenChange, tarjeta }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(tarjeta))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialForm(tarjeta))
      setError(null)
    }
    onOpenChange(next)
  }

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    fd.append('nombre', form.nombre)
    fd.append('banco', form.banco)
    fd.append('tipo', form.tipo)
    fd.append('titular_tipo', form.titular_tipo)
    if (form.titular_nombre) fd.append('titular_nombre', form.titular_nombre)
    if (form.ultimos_4) fd.append('ultimos_4', form.ultimos_4)
    if (form.limite_credito) fd.append('limite_credito', form.limite_credito)
    if (form.dia_corte) fd.append('dia_corte', form.dia_corte)
    if (form.dia_limite_pago) fd.append('dia_limite_pago', form.dia_limite_pago)

    startTransition(async () => {
      const result = tarjeta
        ? await actualizarTarjeta(tarjeta.id, fd)
        : await crearTarjeta(fd)

      if (result.error) {
        setError(result.error)
      } else {
        setForm(initialForm(tarjeta))
        setError(null)
        onOpenChange(false)
      }
    })
  }

  const isEditing = !!tarjeta
  const selectClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold">
              {isEditing ? 'Editar tarjeta' : 'Nueva tarjeta'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 px-5 py-5">
              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="ej. Daniel, Tania, Familiar..."
                  value={form.nombre}
                  onChange={set('nombre')}
                  required
                />
              </div>

              {/* Banco */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="banco">Banco / tienda</Label>
                <Input
                  id="banco"
                  placeholder="BBVA, Santander, Liverpool..."
                  value={form.banco}
                  onChange={set('banco')}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  value={form.tipo}
                  onChange={set('tipo')}
                  className={selectClass}
                  required
                >
                  {TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Titular tipo */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="titular_tipo">Titular</Label>
                <select
                  id="titular_tipo"
                  value={form.titular_tipo}
                  onChange={set('titular_tipo')}
                  className={selectClass}
                >
                  {TITULAR_TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre del titular */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="titular_nombre">Nombre del titular (opcional)</Label>
                <Input
                  id="titular_nombre"
                  placeholder="ej. Daniel Medina"
                  value={form.titular_nombre}
                  onChange={set('titular_nombre')}
                />
              </div>

              {/* Últimos 4 dígitos */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ultimos_4">Últimos 4 dígitos (opcional)</Label>
                <Input
                  id="ultimos_4"
                  placeholder="ej. 4521"
                  maxLength={4}
                  value={form.ultimos_4}
                  onChange={set('ultimos_4')}
                />
              </div>

              {/* Límite de crédito */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="limite_credito">Límite de crédito (opcional)</Label>
                <Input
                  id="limite_credito"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.limite_credito}
                  onChange={set('limite_credito')}
                />
              </div>

              {/* Días de ciclo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dia_corte">Día de corte</Label>
                  <Input
                    id="dia_corte"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="ej. 5"
                    value={form.dia_corte}
                    onChange={set('dia_corte')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dia_limite_pago">Día límite pago</Label>
                  <Input
                    id="dia_limite_pago"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="ej. 20"
                    value={form.dia_limite_pago}
                    onChange={set('dia_limite_pago')}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto border-t px-5 py-4">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? 'Guardando...'
                    : 'Creando...'
                  : isEditing
                  ? 'Guardar cambios'
                  : 'Crear tarjeta'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
