'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrarGasto } from '@/app/(dashboard)/gastos/actions'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

const CATEGORIA_OPTIONS = [
  { value: 'comida', label: 'Comida' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'despensa', label: 'Despensa' },
  { value: 'salud', label: 'Salud' },
  { value: 'escuela', label: 'Escuela' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'mascota', label: 'Mascota' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'imprevisto', label: 'Imprevisto' },
  { value: 'varios_efectivo', label: 'Varios efectivo' },
  { value: 'otro', label: 'Otro' },
]

const FORMA_PAGO_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito_revolvente', label: 'Crédito revolvente' },
  { value: 'msi', label: 'MSI' },
  { value: 'prestamo', label: 'Préstamo' },
]

interface FormState {
  monto: string
  descripcion: string
  categoria: string
  forma_pago: string
  cuenta_id: string
  tarjeta_id: string
  meses_msi: string
  fecha: string
  notas: string
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function initialForm(): FormState {
  return {
    monto: '',
    descripcion: '',
    categoria: 'otro',
    forma_pago: 'efectivo',
    cuenta_id: '',
    tarjeta_id: '',
    meses_msi: '',
    fecha: todayISO(),
    notas: '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
}

export default function RegistrarGastoForm({ open, onOpenChange, cuentas, tarjetas }: Props) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(initialForm())
      setError(null)
    }
    onOpenChange(next)
  }

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '') fd.append(k, v)
    })

    startTransition(async () => {
      const result = await registrarGasto(fd)
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  const needsCuenta = form.forma_pago === 'efectivo' || form.forma_pago === 'debito'
  const needsTarjeta = form.forma_pago === 'credito_revolvente' || form.forma_pago === 'msi'
  const needsMsi = form.forma_pago === 'msi'

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
          <div className="flex items-center justify-between border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold">Registrar gasto</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 px-5 py-5">
              {/* Monto — grande y primero */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-monto">Monto</Label>
                <Input
                  id="g-monto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={set('monto')}
                  className="text-2xl h-14 font-bold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-desc">Descripción</Label>
                <Input
                  id="g-desc"
                  placeholder="ej. Tacos, gasolina PEMEX..."
                  value={form.descripcion}
                  onChange={set('descripcion')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-cat">Categoría</Label>
                <select
                  id="g-cat"
                  value={form.categoria}
                  onChange={set('categoria')}
                  className={selectClass}
                >
                  {CATEGORIA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-fp">Forma de pago</Label>
                <select
                  id="g-fp"
                  value={form.forma_pago}
                  onChange={set('forma_pago')}
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
                  <Label htmlFor="g-cuenta">Cuenta</Label>
                  <select
                    id="g-cuenta"
                    value={form.cuenta_id}
                    onChange={set('cuenta_id')}
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

              {needsTarjeta && tarjetas.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="g-tarjeta">Tarjeta</Label>
                  <select
                    id="g-tarjeta"
                    value={form.tarjeta_id}
                    onChange={set('tarjeta_id')}
                    className={selectClass}
                  >
                    <option value="">— Selecciona tarjeta —</option>
                    {tarjetas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {needsMsi && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="g-msi">Meses MSI</Label>
                  <Input
                    id="g-msi"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="ej. 3, 6, 12"
                    value={form.meses_msi}
                    onChange={set('meses_msi')}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-fecha">Fecha</Label>
                <Input
                  id="g-fecha"
                  type="date"
                  value={form.fecha}
                  onChange={set('fecha')}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-notas">Notas (opcional)</Label>
                <Input
                  id="g-notas"
                  placeholder="Notas adicionales..."
                  value={form.notas}
                  onChange={set('notas')}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-auto border-t px-5 py-4">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Registrando...' : 'Registrar gasto'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
