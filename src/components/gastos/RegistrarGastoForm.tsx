'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrarGasto, actualizarGasto } from '@/app/(dashboard)/gastos/actions'
import MontoInput from '@/components/ui/MontoInput'
import TagInput from '@/components/ui/TagInput'
import type { PrevistoBasico } from '@/app/(dashboard)/gastos/actions'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']
type Transaccion = Database['public']['Tables']['transacciones']['Row']

const CATEGORIA_OPTIONS = [
  { value: 'comida', label: 'Comida' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'despensa', label: 'Despensa' },
  { value: 'casa', label: 'Casa' },
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
  etiquetas: string[]
}

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

function initialForm(tx?: Transaccion | null): FormState {
  if (!tx) {
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
      etiquetas: [],
    }
  }
  return {
    monto: String(Number(tx.monto ?? 0)),
    descripcion: tx.descripcion ?? '',
    categoria: tx.categoria ?? 'otro',
    forma_pago: tx.forma_pago ?? 'efectivo',
    cuenta_id: tx.cuenta_id ?? '',
    tarjeta_id: tx.tarjeta_id ?? '',
    meses_msi: tx.meses_msi != null ? String(tx.meses_msi) : '',
    fecha: tx.fecha.slice(0, 10),
    notas: tx.notas ?? '',
    etiquetas: (tx as Transaccion & { etiquetas?: string[] | null }).etiquetas ?? [],
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
  /** Etiquetas existentes para sugerir en autocomplete */
  etiquetasSugeridas?: string[]
  /** Si se pasa, el form entra en modo edición */
  transaccion?: Transaccion | null
  /** Llamado tras guardar exitosamente un nuevo gasto */
  onSave?: (data: { previstosCoincidentes?: PrevistoBasico[]; transaccionId?: string }) => void
}

const STORAGE_KEY_CUENTA = 'finus_cuenta_predeterminada'

export default function RegistrarGastoForm({ open, onOpenChange, cuentas, tarjetas, etiquetasSugeridas = [], transaccion, onSave }: Props) {
  const isEditing = !!transaccion
  const [form, setForm] = useState<FormState>(() => initialForm(transaccion))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Al abrir el form por primera vez (no edición), preseleccionar cuenta predeterminada
  useEffect(() => {
    if (!open || isEditing) return
    const cuentaPred = localStorage.getItem(STORAGE_KEY_CUENTA)
    if (cuentaPred && cuentas.some((c) => c.id === cuentaPred)) {
      setForm((p) => ({ ...p, cuenta_id: p.cuenta_id || cuentaPred }))
    }
  }, [open, isEditing, cuentas])

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(initialForm(transaccion))
      setError(null)
    }
    onOpenChange(next)
  }

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      if (key === 'cuenta_id' && value) {
        localStorage.setItem(STORAGE_KEY_CUENTA, value)
      }
      setForm((p) => ({ ...p, [key]: value }))
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'etiquetas') {
        fd.append(k, JSON.stringify(v))
      } else if (v !== '') {
        fd.append(k, v as string)
      }
    })

    // Validar que haya cuenta seleccionada cuando la forma de pago lo requiere
    if (['efectivo', 'debito'].includes(form.forma_pago) && !form.cuenta_id) {
      setError('Selecciona una cuenta para descontar el gasto del saldo')
      return
    }

    startTransition(async () => {
      if (isEditing) {
        const result = await actualizarGasto(transaccion!.id, fd)
        if (result.error) {
          setError(result.error)
        } else {
          setForm(initialForm(transaccion))
          setError(null)
          onOpenChange(false)
        }
      } else {
        const result = await registrarGasto(fd)
        if (result.error) {
          setError(result.error)
        } else {
          setForm(initialForm(null))
          setError(null)
          onOpenChange(false)
          onSave?.({
            previstosCoincidentes: result.previstosCoincidentes,
            transaccionId: result.transaccionId,
          })
        }
      }
    })
  }

  const needsCuenta = form.forma_pago === 'efectivo' || form.forma_pago === 'debito'
  const needsTarjeta = form.forma_pago === 'credito_revolvente' || form.forma_pago === 'msi'
  const needsMsi = form.forma_pago === 'msi'

  // Filtrar cuentas según la forma de pago seleccionada
  const cuentasFiltradas = useMemo(() => {
    if (form.forma_pago === 'efectivo') return cuentas.filter((c) => c.tipo === 'efectivo')
    if (form.forma_pago === 'debito') return cuentas.filter((c) => c.tipo === 'banco' || c.tipo === 'digital')
    return cuentas
  }, [form.forma_pago, cuentas])

  // Handler específico para forma_pago: resetea cuenta_id si ya no aplica al nuevo tipo
  const handleFormaPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaForma = e.target.value
    setForm((p) => {
      const nuevasFiltradas =
        nuevaForma === 'efectivo'
          ? cuentas.filter((c) => c.tipo === 'efectivo')
          : nuevaForma === 'debito'
          ? cuentas.filter((c) => c.tipo === 'banco' || c.tipo === 'digital')
          : cuentas
      const cuentaSigueValida = nuevasFiltradas.some((c) => c.id === p.cuenta_id)
      return {
        ...p,
        forma_pago: nuevaForma,
        cuenta_id: cuentaSigueValida ? p.cuenta_id : '',
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
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl overflow-hidden focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold">
              {isEditing ? 'Editar gasto' : 'Registrar gasto'}
            </Dialog.Title>
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
                <MontoInput
                  id="g-monto"
                  value={form.monto}
                  onChange={(val) => setForm((p) => ({ ...p, monto: val }))}
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
                  onChange={handleFormaPagoChange}
                  className={selectClass}
                >
                  {FORMA_PAGO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {needsCuenta && cuentasFiltradas.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="g-cuenta">Cuenta</Label>
                  <select
                    id="g-cuenta"
                    value={form.cuenta_id}
                    onChange={set('cuenta_id')}
                    className={selectClass}
                  >
                    <option value="">— Selecciona cuenta —</option>
                    {cuentasFiltradas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {needsCuenta && cuentasFiltradas.length === 0 && (
                <p className="rounded-md bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                  No tienes cuentas de tipo{' '}
                  {form.forma_pago === 'efectivo' ? 'efectivo' : 'débito'} registradas.
                </p>
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
                {form.fecha > todayISO() && (
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Estás registrando un gasto con fecha futura.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Etiquetas (opcional)</Label>
                <TagInput
                  value={form.etiquetas}
                  onChange={(tags) => setForm((p) => ({ ...p, etiquetas: tags }))}
                  sugerencias={etiquetasSugeridas}
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
                {isPending
                  ? isEditing ? 'Guardando...' : 'Registrando...'
                  : isEditing ? 'Guardar cambios' : 'Registrar gasto'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
