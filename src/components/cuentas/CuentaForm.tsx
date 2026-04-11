'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearCuenta, actualizarCuenta } from '@/app/(dashboard)/cuentas/actions'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

const TIPO_OPTIONS = [
  { value: 'banco', label: 'Banco' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'digital', label: 'Digital' },
  { value: 'inversion', label: 'Inversión' },
]

interface FormState {
  nombre: string
  tipo: string
  moneda: string
  color: string
  icono: string
  tiene_tarjeta_debito: boolean
  ultimos_4_debito: string
}

function initialForm(cuenta?: Cuenta | null, tipoDefault?: string): FormState {
  if (!cuenta) {
    return {
      nombre: '',
      tipo: tipoDefault ?? 'banco',
      moneda: 'MXN',
      color: '',
      icono: '',
      tiene_tarjeta_debito: false,
      ultimos_4_debito: '',
    }
  }
  return {
    nombre: cuenta.nombre,
    tipo: cuenta.tipo,
    moneda: cuenta.moneda,
    color: cuenta.color ?? '',
    icono: cuenta.icono ?? '',
    tiene_tarjeta_debito: cuenta.tiene_tarjeta_debito,
    ultimos_4_debito: cuenta.ultimos_4_debito ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cuenta?: Cuenta | null
  /** Pre-llena el campo tipo al crear (ej: 'efectivo' desde el banner) */
  tipoDefault?: string
}

export default function CuentaForm({ open, onOpenChange, cuenta, tipoDefault }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(cuenta, tipoDefault))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEditing = !!cuenta

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialForm(cuenta, tipoDefault))
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
    if (!form.nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    setError(null)

    const fd = new FormData()
    fd.append('nombre', form.nombre)
    fd.append('tipo', form.tipo)
    fd.append('moneda', form.moneda || 'MXN')
    fd.append('tiene_tarjeta_debito', form.tiene_tarjeta_debito ? 'true' : 'false')
    if (form.tiene_tarjeta_debito && form.ultimos_4_debito)
      fd.append('ultimos_4_debito', form.ultimos_4_debito)
    if (form.color) fd.append('color', form.color)
    if (form.icono) fd.append('icono', form.icono)

    startTransition(async () => {
      const result = isEditing
        ? await actualizarCuenta(cuenta.id, fd)
        : await crearCuenta(fd)

      if (result.error) {
        setError(result.error)
      } else {
        setForm(initialForm(cuenta, tipoDefault))
        setError(null)
        onOpenChange(false)
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
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold">
              {isEditing ? 'Editar cuenta' : 'Nueva cuenta'}
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
                  placeholder="ej. BBVA débito, Efectivo bolsillo..."
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

              {/* Moneda */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="moneda">Moneda</Label>
                <Input
                  id="moneda"
                  placeholder="MXN"
                  value={form.moneda}
                  onChange={set('moneda')}
                />
              </div>

              {/* Tarjeta débito */}
              <div className="flex items-center gap-2.5">
                <input
                  id="tiene_tarjeta_debito"
                  type="checkbox"
                  checked={form.tiene_tarjeta_debito}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tiene_tarjeta_debito: e.target.checked,
                      ultimos_4_debito: e.target.checked ? p.ultimos_4_debito : '',
                    }))
                  }
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="tiene_tarjeta_debito" className="cursor-pointer">
                  Tiene tarjeta débito asociada
                </Label>
              </div>

              {form.tiene_tarjeta_debito && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ultimos_4_debito">Últimos 4 dígitos de la tarjeta</Label>
                  <Input
                    id="ultimos_4_debito"
                    placeholder="ej. 4321"
                    maxLength={4}
                    value={form.ultimos_4_debito}
                    onChange={set('ultimos_4_debito')}
                  />
                </div>
              )}

              {/* Color e icono */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="color">Color (opcional)</Label>
                  <Input
                    id="color"
                    placeholder="ej. #3B82F6"
                    value={form.color}
                    onChange={set('color')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="icono">Icono (opcional)</Label>
                  <Input
                    id="icono"
                    placeholder="ej. 🏦 💵"
                    value={form.icono}
                    onChange={set('icono')}
                  />
                </div>
              </div>

              {isEditing && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  El saldo se actualiza automáticamente al registrar ingresos y gastos. No se puede editar directamente.
                </p>
              )}

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
                  ? isEditing ? 'Guardando...' : 'Creando...'
                  : isEditing ? 'Guardar cambios' : 'Crear cuenta'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
