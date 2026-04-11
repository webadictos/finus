'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearCompromiso, actualizarCompromiso } from '@/app/(dashboard)/compromisos/actions'
import type { Database } from '@/types/database'
import type { TipoPago } from '@/types/finus'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

const TIPO_PAGO_OPTIONS: { value: TipoPago; label: string }[] = [
  { value: 'fijo', label: 'Pago fijo — monto que no cambia (Telmex, renta, seguro)' },
  { value: 'revolvente', label: 'Tarjeta revolvente — saldo con intereses' },
  { value: 'msi', label: 'Meses sin intereses — mensualidad fija obligatoria' },
  { value: 'prestamo', label: 'Préstamo — cuota fija hasta liquidar' },
  { value: 'suscripcion', label: 'Suscripción — cobro automático recurrente (Netflix, Spotify, Claude)' },
  { value: 'disposicion_efectivo', label: 'Disposición de efectivo — intereses desde día 1' },
]

const FRECUENCIA_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'anual', label: 'Anual' },
]

const PRIORIDAD_OPTIONS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

interface FormState {
  nombre: string
  tipo_pago: TipoPago
  frecuencia: string
  monto_mensualidad: string
  fecha_proximo_pago: string
  mensualidades_restantes: string
  prioridad: string
  tarjeta_id: string
  saldo_real: string
  pago_sin_intereses: string
  pago_minimo: string
  tasa_interes_anual: string
}

function initialForm(c?: Compromiso | null): FormState {
  if (!c) {
    return {
      nombre: '',
      tipo_pago: 'fijo',
      frecuencia: 'mensual',
      monto_mensualidad: '',
      fecha_proximo_pago: '',
      mensualidades_restantes: '',
      prioridad: '',
      tarjeta_id: '',
      saldo_real: '',
      pago_sin_intereses: '',
      pago_minimo: '',
      tasa_interes_anual: '',
    }
  }
  return {
    nombre: c.nombre,
    tipo_pago: c.tipo_pago,
    frecuencia: c.frecuencia ?? 'mensual',
    monto_mensualidad: c.monto_mensualidad != null ? String(Number(c.monto_mensualidad)) : '',
    fecha_proximo_pago: c.fecha_proximo_pago ?? '',
    mensualidades_restantes: c.mensualidades_restantes != null ? String(c.mensualidades_restantes) : '',
    prioridad: c.prioridad ?? '',
    tarjeta_id: c.tarjeta_id ?? '',
    saldo_real: c.saldo_real != null ? String(Number(c.saldo_real)) : '',
    pago_sin_intereses: c.pago_sin_intereses != null ? String(Number(c.pago_sin_intereses)) : '',
    pago_minimo: c.pago_minimo != null ? String(Number(c.pago_minimo)) : '',
    tasa_interes_anual:
      c.tasa_interes_anual != null ? String(Number(c.tasa_interes_anual)) : '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  compromiso?: Compromiso | null
  tarjetas: Tarjeta[]
  /** Si se pasa, el selector de tarjeta queda fijo con este id y no es editable */
  tarjetaIdFijo?: string
}

export default function CompromisoForm({ open, onOpenChange, compromiso, tarjetas, tarjetaIdFijo }: Props) {
  const [form, setForm] = useState<FormState>(() => {
    const base = initialForm(compromiso)
    if (tarjetaIdFijo && !compromiso) base.tarjeta_id = tarjetaIdFijo
    return base
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      const base = initialForm(compromiso)
      if (tarjetaIdFijo && !compromiso) base.tarjeta_id = tarjetaIdFijo
      setForm(base)
      setError(null)
    }
    onOpenChange(next)
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '') fd.append(k, v)
    })

    startTransition(async () => {
      const result = compromiso
        ? await actualizarCompromiso(compromiso.id, fd)
        : await crearCompromiso(fd)

      if (result.error) {
        setError(result.error)
      } else {
        const base = initialForm(compromiso)
        if (tarjetaIdFijo && !compromiso) base.tarjeta_id = tarjetaIdFijo
        setForm(base)
        setError(null)
        onOpenChange(false)
      }
    })
  }

  const isRevolvente = form.tipo_pago === 'revolvente'
  const isMSI = form.tipo_pago === 'msi'
  const isEditing = !!compromiso

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
              {isEditing ? 'Editar compromiso' : 'Nuevo compromiso'}
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
                  placeholder="ej. Nu TC, Telmex, Bravo..."
                  value={form.nombre}
                  onChange={set('nombre')}
                  required
                />
              </div>

              {/* Tipo de compromiso */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipo_pago">Tipo de compromiso</Label>
                <select
                  id="tipo_pago"
                  value={form.tipo_pago}
                  onChange={set('tipo_pago')}
                  className={selectClass}
                  required
                >
                  {TIPO_PAGO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frecuencia */}
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

              {/* Monto mensualidad */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monto_mensualidad">
                  {isMSI ? 'Mensualidad MSI' : isRevolvente ? 'Monto a pagar este corte' : 'Mensualidad / cuota'}
                </Label>
                <Input
                  id="monto_mensualidad"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monto_mensualidad}
                  onChange={set('monto_mensualidad')}
                  required
                />
              </div>

              {/* Fecha próximo pago */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_proximo_pago">Fecha próximo pago</Label>
                <Input
                  id="fecha_proximo_pago"
                  type="date"
                  value={form.fecha_proximo_pago}
                  onChange={set('fecha_proximo_pago')}
                />
              </div>

              {/* MSI: mensualidades restantes */}
              {isMSI && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mensualidades_restantes">Mensualidades restantes</Label>
                  <Input
                    id="mensualidades_restantes"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="ej. 12"
                    value={form.mensualidades_restantes}
                    onChange={set('mensualidades_restantes')}
                  />
                </div>
              )}

              {/* Revolvente: campos adicionales */}
              {isRevolvente && (
                <>
                  <div className="rounded-md border border-dashed p-3">
                    <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Campos revolvente
                    </p>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="saldo_real">Saldo actual de la tarjeta</Label>
                        <Input
                          id="saldo_real"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.saldo_real}
                          onChange={set('saldo_real')}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pago_sin_intereses">Pago para no generar intereses</Label>
                        <Input
                          id="pago_sin_intereses"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.pago_sin_intereses}
                          onChange={set('pago_sin_intereses')}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pago_minimo">Pago mínimo</Label>
                        <Input
                          id="pago_minimo"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.pago_minimo}
                          onChange={set('pago_minimo')}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="tasa_interes_anual">Tasa de interés anual (%)</Label>
                        <Input
                          id="tasa_interes_anual"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="ej. 36.5"
                          value={form.tasa_interes_anual}
                          onChange={set('tasa_interes_anual')}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Prioridad */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prioridad">Prioridad</Label>
                <select
                  id="prioridad"
                  value={form.prioridad}
                  onChange={set('prioridad')}
                  className={selectClass}
                >
                  <option value="">Sin prioridad</option>
                  {PRIORIDAD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tarjeta asociada */}
              {tarjetaIdFijo ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Tarjeta</Label>
                  <p className="h-9 flex items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                    {tarjetas.find((t) => t.id === tarjetaIdFijo)?.nombre ?? tarjetaIdFijo}
                  </p>
                </div>
              ) : tarjetas.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tarjeta_id">Tarjeta asociada (opcional)</Label>
                  <select
                    id="tarjeta_id"
                    value={form.tarjeta_id}
                    onChange={set('tarjeta_id')}
                    className={selectClass}
                  >
                    <option value="">Sin tarjeta</option>
                    {tarjetas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

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
                  : 'Crear compromiso'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
