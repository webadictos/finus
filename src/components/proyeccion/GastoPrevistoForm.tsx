'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  crearGastoPrevisto,
  actualizarGastoPrevisto,
} from '@/app/(dashboard)/proyeccion/actions'
import type { Database } from '@/types/database'

type GastoPrevisto = Database['public']['Tables']['gastos_previstos']['Row']

const TIPO_OPTIONS = [
  { value: 'recurrente_aprox', label: 'Recurrente aproximado' },
  { value: 'previsto_sin_fecha', label: 'Previsto sin fecha' },
  { value: 'eventual', label: 'Eventual' },
]

const FRECUENCIA_OPTIONS = [
  { value: '7', label: 'Semanal (7 días)' },
  { value: '15', label: 'Quincenal (15 días)' },
  { value: '30', label: 'Mensual (30 días)' },
  { value: '60', label: 'Bimestral (60 días)' },
  { value: '90', label: 'Trimestral (90 días)' },
  { value: '365', label: 'Anual (365 días)' },
]

const CERTEZA_OPTIONS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

interface FormState {
  nombre: string
  monto_estimado: string
  tipo_programacion: string
  certeza: string
  frecuencia_dias: string
  mes: string
}

function initialForm(g?: GastoPrevisto | null): FormState {
  if (!g) {
    return {
      nombre: '',
      monto_estimado: '',
      tipo_programacion: 'eventual',
      certeza: 'media',
      frecuencia_dias: '',
      mes: '',
    }
  }
  return {
    nombre: g.nombre,
    monto_estimado: String(Number(g.monto_estimado)),
    tipo_programacion: g.tipo_programacion,
    certeza: g.certeza,
    frecuencia_dias: g.frecuencia_dias != null ? String(g.frecuencia_dias) : '',
    mes: g.mes ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  gasto?: GastoPrevisto | null
}

export default function GastoPrevistoForm({ open, onOpenChange, gasto }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(gasto))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(initialForm(gasto))
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
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '') fd.append(k, v)
    })

    startTransition(async () => {
      const result = gasto
        ? await actualizarGastoPrevisto(gasto.id, fd)
        : await crearGastoPrevisto(fd)

      if (result.error) {
        setError(result.error)
      } else {
        setForm(initialForm(gasto))
        setError(null)
        onOpenChange(false)
      }
    })
  }

  const isEditing = !!gasto
  const isRecurrente = form.tipo_programacion === 'recurrente_aprox'
  const isPrevisto = form.tipo_programacion === 'previsto_sin_fecha'

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
            <Dialog.Title className="text-base font-semibold">
              {isEditing ? 'Editar gasto previsto' : 'Nuevo gasto previsto'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gp-nombre">Nombre</Label>
                <Input
                  id="gp-nombre"
                  placeholder="ej. Tenencia, Vacaciones, Seguro..."
                  value={form.nombre}
                  onChange={set('nombre')}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gp-monto">Monto estimado</Label>
                <Input
                  id="gp-monto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monto_estimado}
                  onChange={set('monto_estimado')}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gp-tipo">Tipo</Label>
                <select
                  id="gp-tipo"
                  value={form.tipo_programacion}
                  onChange={set('tipo_programacion')}
                  className={selectClass}
                >
                  {TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gp-certeza">Certeza</Label>
                <select
                  id="gp-certeza"
                  value={form.certeza}
                  onChange={set('certeza')}
                  className={selectClass}
                >
                  {CERTEZA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {isRecurrente && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gp-freq">Frecuencia</Label>
                  <select
                    id="gp-freq"
                    value={FRECUENCIA_OPTIONS.some((o) => o.value === form.frecuencia_dias) ? form.frecuencia_dias : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setForm((p) => ({ ...p, frecuencia_dias: e.target.value }))
                      } else {
                        setForm((p) => ({ ...p, frecuencia_dias: '' }))
                      }
                    }}
                    className={selectClass}
                  >
                    {FRECUENCIA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    <option value="custom">Personalizado</option>
                  </select>
                  {!FRECUENCIA_OPTIONS.some((o) => o.value === form.frecuencia_dias) && (
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Número de días"
                      value={form.frecuencia_dias}
                      onChange={set('frecuencia_dias')}
                    />
                  )}
                </div>
              )}

              {isPrevisto && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gp-mes">Mes estimado</Label>
                  <Input
                    id="gp-mes"
                    type="month"
                    value={form.mes}
                    onChange={set('mes')}
                  />
                </div>
              )}

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-auto border-t px-5 py-4">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? 'Guardando...'
                    : 'Creando...'
                  : isEditing
                  ? 'Guardar cambios'
                  : 'Crear gasto previsto'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
