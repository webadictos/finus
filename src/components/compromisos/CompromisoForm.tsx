'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearCompromiso, actualizarCompromiso } from '@/app/(dashboard)/compromisos/actions'
import MontoInput from '@/components/ui/MontoInput'
import {
  formatISODateForLocale,
  formatISODateLocal,
  parseISODateLocal,
} from '@/lib/local-date'
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

const NUEVO_COMPROMISO_OPTIONS: TipoPago[] = ['fijo', 'prestamo', 'suscripcion']
const LEGACY_CREDIT_OPTIONS: TipoPago[] = ['revolvente', 'msi', 'disposicion_efectivo']

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
  fecha_fin_estimada: string
  meses_totales: string
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
      fecha_fin_estimada: '',
      meses_totales: '',
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
    fecha_fin_estimada: c.fecha_fin_estimada ?? '',
    meses_totales: c.meses_totales != null ? String(c.meses_totales) : '',
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

// ─── Helpers de frecuencia ────────────────────────────────────────────────────

const FREQ_DIVISOR: Record<string, number> = {
  mensual: 30,
  quincenal: 15,
  semanal: 7,
  anual: 365,
}

function calcFechaFin(fechaInicio: string, pagos: number, frecuencia: string): string {
  const base = parseISODateLocal(fechaInicio)
  if (frecuencia === 'mensual') {
    base.setMonth(base.getMonth() + (pagos - 1))
  } else if (frecuencia === 'anual') {
    base.setFullYear(base.getFullYear() + (pagos - 1))
  } else {
    base.setDate(base.getDate() + (pagos - 1) * (FREQ_DIVISOR[frecuencia] ?? 30))
  }
  return formatISODateLocal(base)
}

function calcPagosRestantes(fechaInicio: string, fechaFin: string, frecuencia: string): number {
  const inicio = parseISODateLocal(fechaInicio)
  const fin = parseISODateLocal(fechaFin)
  const dias = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  const divisor = FREQ_DIVISOR[frecuencia] ?? 30
  return Math.max(1, Math.ceil((dias + 1) / divisor))
}

// ─────────────────────────────────────────────────────────────────────────────

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

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value
    setForm((p) => {
      const next = { ...p, [key]: value }
      // Frequency to use for calculations — updated if frecuencia is the changing field
      const freq = key === 'frecuencia' ? value : next.frecuencia

      // pagos → fecha_fin
      if (key === 'mensualidades_restantes' && next.fecha_proximo_pago) {
        const n = parseInt(value)
        if (!isNaN(n) && n > 0) {
          next.fecha_fin_estimada = calcFechaFin(next.fecha_proximo_pago, n, freq)
        } else {
          next.fecha_fin_estimada = ''
        }
      }

      // fecha_fin → pagos
      if (key === 'fecha_fin_estimada' && value && next.fecha_proximo_pago) {
        const pagos = calcPagosRestantes(next.fecha_proximo_pago, value, freq)
        next.mensualidades_restantes = String(pagos)
      }

      // frecuencia → recalculate pagos from fecha_fin if both dates exist
      if (key === 'frecuencia' && next.fecha_fin_estimada && next.fecha_proximo_pago) {
        const pagos = calcPagosRestantes(next.fecha_proximo_pago, next.fecha_fin_estimada, value)
        next.mensualidades_restantes = String(pagos)
      }

      return next
    })
  }

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
  const isPrestamo = form.tipo_pago === 'prestamo'
  const isEditing = !!compromiso
  const tipoPagoOptions = TIPO_PAGO_OPTIONS.filter((option) => {
    if (NUEVO_COMPROMISO_OPTIONS.includes(option.value)) return true
    return isEditing && LEGACY_CREDIT_OPTIONS.includes(option.value) && option.value === compromiso?.tipo_pago
  })

  // Computed display values for liquidation fields
  const fechaFinCalculada = (() => {
    if (!form.mensualidades_restantes || !form.fecha_proximo_pago) return null
    const n = parseInt(form.mensualidades_restantes)
    if (isNaN(n) || n <= 0) return null
    const fechaStr = calcFechaFin(form.fecha_proximo_pago, n, form.frecuencia)
    return formatISODateForLocale(fechaStr, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  })()

  const pagosCalculados = (() => {
    if (!form.fecha_fin_estimada || !form.fecha_proximo_pago) return null
    return calcPagosRestantes(form.fecha_proximo_pago, form.fecha_fin_estimada, form.frecuencia)
  })()

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
                  {tipoPagoOptions.map((o) => (
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
                <MontoInput
                  id="monto_mensualidad"
                  value={form.monto_mensualidad}
                  onChange={(val) => setForm((p) => ({ ...p, monto_mensualidad: val }))}
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

              {/* MSI / Préstamo: campos de liquidación */}
              {(isMSI || isPrestamo) && (
                <div className="rounded-md border border-dashed p-3">
                  <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Liquidación
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mensualidades_restantes">Pagos restantes</Label>
                      <Input
                        id="mensualidades_restantes"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="ej. 12"
                        value={form.mensualidades_restantes}
                        onChange={set('mensualidades_restantes')}
                      />
                      {fechaFinCalculada && (
                        <p className="text-xs text-muted-foreground">
                          Último pago estimado: <span className="font-medium text-foreground">{fechaFinCalculada}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="fecha_fin_estimada">Fecha de último pago (opcional)</Label>
                      <Input
                        id="fecha_fin_estimada"
                        type="date"
                        value={form.fecha_fin_estimada}
                        onChange={set('fecha_fin_estimada')}
                      />
                      {pagosCalculados !== null && !form.mensualidades_restantes && (
                        <p className="text-xs text-muted-foreground">
                          Pagos calculados: <span className="font-medium text-foreground">{pagosCalculados}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="meses_totales">Meses totales del plan (opcional)</Label>
                      <Input
                        id="meses_totales"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="ej. 18"
                        value={form.meses_totales}
                        onChange={set('meses_totales')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha de último pago — para tipos que NO tienen bloque liquidación */}
              {!isMSI && !isPrestamo && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fecha_fin_estimada_general">Fecha de último pago (opcional)</Label>
                  <Input
                    id="fecha_fin_estimada_general"
                    type="date"
                    value={form.fecha_fin_estimada}
                    onChange={set('fecha_fin_estimada')}
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
                        <MontoInput
                          id="saldo_real"
                          value={form.saldo_real}
                          onChange={(val) => setForm((p) => ({ ...p, saldo_real: val }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pago_sin_intereses">Pago para no generar intereses</Label>
                        <MontoInput
                          id="pago_sin_intereses"
                          value={form.pago_sin_intereses}
                          onChange={(val) => setForm((p) => ({ ...p, pago_sin_intereses: val }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pago_minimo">Pago mínimo</Label>
                        <MontoInput
                          id="pago_minimo"
                          value={form.pago_minimo}
                          onChange={(val) => setForm((p) => ({ ...p, pago_minimo: val }))}
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
