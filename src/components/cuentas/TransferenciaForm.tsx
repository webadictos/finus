'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { transferirEntreCuentas } from '@/app/(dashboard)/cuentas/actions'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

type Step = 'form' | 'confirm'

interface FormState {
  cuentaOrigenId: string
  cuentaDestinoId: string
  monto: string
  fecha: string
  notas: string
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function initialForm(cuentas: Cuenta[]): FormState {
  return {
    cuentaOrigenId: cuentas[0]?.id ?? '',
    cuentaDestinoId: cuentas[1]?.id ?? '',
    monto: '',
    fecha: todayISO(),
    notas: '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cuentas: Cuenta[]
}

export default function TransferenciaForm({ open, onOpenChange, cuentas }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(cuentas))
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialForm(cuentas))
      setStep('form')
      setError(null)
    }
    onOpenChange(next)
  }

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  // Cuentas destino excluyen la cuenta origen seleccionada
  const cuentasDestino = cuentas.filter((c) => c.id !== form.cuentaOrigenId)

  // Cuando cambia el origen, asegurarse de que el destino sea válido
  const handleOrigenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrigenId = e.target.value
    setForm((p) => ({
      ...p,
      cuentaOrigenId: newOrigenId,
      cuentaDestinoId:
        p.cuentaDestinoId === newOrigenId
          ? (cuentas.find((c) => c.id !== newOrigenId)?.id ?? '')
          : p.cuentaDestinoId,
    }))
  }

  const montoNum = Number(form.monto)
  const cuentaOrigen = cuentas.find((c) => c.id === form.cuentaOrigenId)
  const cuentaDestino = cuentas.find((c) => c.id === form.cuentaDestinoId)

  const handleContinuar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cuentaOrigenId || !form.cuentaDestinoId) {
      setError('Selecciona las cuentas')
      return
    }
    if (form.cuentaOrigenId === form.cuentaDestinoId) {
      setError('La cuenta origen y destino no pueden ser la misma')
      return
    }
    if (!montoNum || montoNum <= 0) {
      setError('Ingresa un monto válido mayor a cero')
      return
    }
    if (!form.fecha) {
      setError('Selecciona una fecha')
      return
    }
    setError(null)
    setStep('confirm')
  }

  const handleConfirmar = () => {
    startTransition(async () => {
      const result = await transferirEntreCuentas(
        form.cuentaOrigenId,
        form.cuentaDestinoId,
        montoNum,
        form.fecha,
        form.notas || undefined
      )
      if (result.error) {
        setError(result.error)
        setStep('form')
      } else {
        handleOpenChange(false)
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
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">
              Transferir entre cuentas
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* ── Paso 1: Formulario ── */}
          {step === 'form' && (
            <form onSubmit={handleContinuar} className="flex flex-col gap-4">
              {/* Origen */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cuenta_origen">Cuenta origen</Label>
                <select
                  id="cuenta_origen"
                  value={form.cuentaOrigenId}
                  onChange={handleOrigenChange}
                  className={selectClass}
                  required
                >
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icono ? `${c.icono} ` : ''}{c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destino */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cuenta_destino">Cuenta destino</Label>
                <select
                  id="cuenta_destino"
                  value={form.cuentaDestinoId}
                  onChange={set('cuentaDestinoId')}
                  className={selectClass}
                  required
                >
                  {cuentasDestino.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icono ? `${c.icono} ` : ''}{c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto + Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto">Monto</Label>
                  <Input
                    id="monto"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monto}
                    onChange={set('monto')}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={set('fecha')}
                    required
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Input
                  id="notas"
                  placeholder="ej. Para pagar renta"
                  value={form.notas}
                  onChange={set('notas')}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full mt-1">
                Continuar
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </form>
          )}

          {/* ── Paso 2: Confirmación ── */}
          {step === 'confirm' && (
            <div className="flex flex-col gap-4">
              {/* Resumen visual */}
              <div className="rounded-lg border bg-muted/40 px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-muted-foreground">Desde</span>
                    <span className="text-sm font-semibold truncate">
                      {cuentaOrigen?.icono ? `${cuentaOrigen.icono} ` : ''}
                      {cuentaOrigen?.nombre}
                    </span>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0 text-right">
                    <span className="text-xs text-muted-foreground">Hacia</span>
                    <span className="text-sm font-semibold truncate">
                      {cuentaDestino?.icono ? `${cuentaDestino.icono} ` : ''}
                      {cuentaDestino?.nombre}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {formatMXN(montoNum)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center leading-snug">
                Esto ajustará el saldo de ambas cuentas de forma inmediata.
              </p>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setStep('form'); setError(null) }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmar}
                  disabled={isPending}
                >
                  {isPending ? 'Transfiriendo...' : 'Confirmar transferencia'}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
