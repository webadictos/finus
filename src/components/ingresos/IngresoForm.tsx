'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearIngreso, actualizarIngreso } from '@/app/(dashboard)/ingresos/actions'
import type { Database } from '@/types/database'

type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

const TIPO_OPTIONS = [
  { value: 'fijo_recurrente', label: 'Fijo recurrente' },
  { value: 'proyecto_recurrente', label: 'Proyecto recurrente' },
  { value: 'unico', label: 'Único / eventual' },
]

const PROBABILIDAD_OPTIONS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

const FRECUENCIA_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'anual', label: 'Anual' },
]

interface FormState {
  nombre: string
  tipo: string
  monto_esperado: string
  fecha_esperada: string
  probabilidad: string
  es_recurrente: boolean
  frecuencia: string
  cuenta_destino_id: string
}

function initialForm(i?: Ingreso | null): FormState {
  if (!i) {
    return {
      nombre: '',
      tipo: 'fijo_recurrente',
      monto_esperado: '',
      fecha_esperada: '',
      probabilidad: 'alta',
      es_recurrente: false,
      frecuencia: 'mensual',
      cuenta_destino_id: '',
    }
  }
  return {
    nombre: i.nombre,
    tipo: i.tipo,
    monto_esperado: i.monto_esperado != null ? String(Number(i.monto_esperado)) : '',
    fecha_esperada: i.fecha_esperada ?? '',
    probabilidad: i.probabilidad,
    es_recurrente: i.es_recurrente,
    frecuencia: i.frecuencia ?? 'mensual',
    cuenta_destino_id: i.cuenta_destino_id ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingreso?: Ingreso | null
  cuentas: Cuenta[]
}

export default function IngresoForm({ open, onOpenChange, ingreso, cuentas }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(ingreso))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialForm(ingreso))
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
    fd.append('tipo', form.tipo)
    fd.append('monto_esperado', form.monto_esperado)
    fd.append('fecha_esperada', form.fecha_esperada)
    fd.append('probabilidad', form.probabilidad)
    fd.append('es_recurrente', String(form.es_recurrente))
    if (form.es_recurrente) fd.append('frecuencia', form.frecuencia)
    if (form.cuenta_destino_id) fd.append('cuenta_destino_id', form.cuenta_destino_id)

    startTransition(async () => {
      const result = ingreso
        ? await actualizarIngreso(ingreso.id, fd)
        : await crearIngreso(fd)

      if (result.error) {
        setError(result.error)
      } else {
        setForm(initialForm(ingreso))
        setError(null)
        onOpenChange(false)
      }
    })
  }

  const isEditing = !!ingreso
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
              {isEditing ? 'Editar ingreso' : 'Nuevo ingreso'}
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
                  placeholder="ej. Nómina, Proyecto X, Freelance..."
                  value={form.nombre}
                  onChange={set('nombre')}
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

              {/* Monto esperado */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monto_esperado">Monto esperado</Label>
                <Input
                  id="monto_esperado"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monto_esperado}
                  onChange={set('monto_esperado')}
                  required
                />
              </div>

              {/* Fecha esperada */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_esperada">Fecha esperada</Label>
                <Input
                  id="fecha_esperada"
                  type="date"
                  value={form.fecha_esperada}
                  onChange={set('fecha_esperada')}
                />
              </div>

              {/* Probabilidad */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="probabilidad">Probabilidad</Label>
                <select
                  id="probabilidad"
                  value={form.probabilidad}
                  onChange={set('probabilidad')}
                  className={selectClass}
                >
                  {PROBABILIDAD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Es recurrente */}
              <div className="flex items-center gap-2.5">
                <input
                  id="es_recurrente"
                  type="checkbox"
                  checked={form.es_recurrente}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, es_recurrente: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="es_recurrente">Es recurrente</Label>
              </div>

              {/* Frecuencia (condicional) */}
              {form.es_recurrente && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="frecuencia">Frecuencia</Label>
                  <select
                    id="frecuencia"
                    value={form.frecuencia}
                    onChange={set('frecuencia')}
                    className={selectClass}
                  >
                    {FRECUENCIA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cuenta destino */}
              {cuentas.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cuenta_destino_id">Cuenta de destino</Label>
                  <select
                    id="cuenta_destino_id"
                    value={form.cuenta_destino_id}
                    onChange={set('cuenta_destino_id')}
                    className={selectClass}
                  >
                    <option value="">— Sin cuenta asociada —</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Al confirmar el ingreso, se sumará a esta cuenta
                  </p>
                </div>
              )}

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
                  : 'Crear ingreso'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
