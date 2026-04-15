'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmarIngreso, confirmarIngresoPhantom } from '@/app/(dashboard)/ingresos/actions'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { formatMXN } from '@/lib/format'
import { parseIngresoPhantomId } from '@/lib/ingreso-phantom'
import { getTodayLocalISO } from '@/lib/local-date'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingresoId: string
  nombre: string
  montoEsperado: number
  esRecurrente: boolean
  frecuencia: string | null
  /** Lista de cuentas disponibles para seleccionar */
  cuentas: Cuenta[]
  /** FK actual del ingreso — null significa que no tiene cuenta asignada todavía */
  cuentaDestinoId?: string | null
  /** Para instancias fantasma (_next): fecha esperada de la siguiente quincena */
  fechaEsperada?: string | null
  onSuccess?: (data: {
    transaccionId: string
    nextIngresoId: string | null
    monto: number
    cuentaId: string | null
  }) => void
}

export default function ConfirmarModal({
  open,
  onOpenChange,
  ingresoId,
  nombre,
  montoEsperado,
  esRecurrente,
  frecuencia,
  cuentas,
  cuentaDestinoId,
  fechaEsperada,
  onSuccess,
}: Props) {
  const { isPhantom, originalId } = parseIngresoPhantomId(ingresoId)
  const today: string = getTodayLocalISO()
  const [monto, setMonto] = useState(String(montoEsperado))
  const [fecha, setFecha] = useState(today)
  const [selectedCuentaId, setSelectedCuentaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasCuenta = !!cuentaDestinoId
  const cuentaNombre = hasCuenta
    ? (cuentas.find((c) => c.id === cuentaDestinoId)?.nombre ?? null)
    : null

  const selectClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30'

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMonto(String(montoEsperado))
      setFecha(today)
      setSelectedCuentaId('')
      setError(null)
      setSuccess(false)
    }
    onOpenChange(next)
  }

  // Paso 1: validar y abrir modal de confirmación
  const confirmar = () => {
    const val = parseFloat(monto)
    if (isNaN(val) || val <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }
    if (!fecha) {
      setError('Ingresa la fecha de recepción')
      return
    }
    if (!hasCuenta && !selectedCuentaId) {
      setError('Selecciona la cuenta a la que llegó este ingreso')
      return
    }
    setError(null)
    setConfirmOpen(true)
  }

  // Paso 2: ejecutar la acción tras confirmación
  const ejecutarConfirmar = () => {
    const val = parseFloat(monto)
    const efectivaCuentaId = hasCuenta ? cuentaDestinoId! : selectedCuentaId
    const cuentaOverride = hasCuenta ? undefined : efectivaCuentaId

    startTransition(async () => {
      const result = isPhantom && fechaEsperada
        ? await confirmarIngresoPhantom(originalId, fechaEsperada, val, fecha, cuentaOverride)
        : await confirmarIngreso(ingresoId, val, fecha, cuentaOverride)
      setConfirmOpen(false)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        if (result.transaccionId) {
          onSuccess?.({
            transaccionId: result.transaccionId,
            nextIngresoId: result.nextIngresoId ?? null,
            monto: val,
            cuentaId: efectivaCuentaId,
          })
        }
        setTimeout(() => onOpenChange(false), 1200)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Confirmar ingreso
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                {nombre}
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-6 text-emerald-600">
              <CheckCircle className="size-10" />
              <p className="font-medium">¡Ingreso confirmado!</p>
              {esRecurrente && frecuencia && (
                <p className="text-xs text-muted-foreground text-center">
                  Se generó la siguiente instancia ({frecuencia})
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Referencia esperado */}
              <p className="mb-4 text-sm text-muted-foreground">
                Esperado:{' '}
                <span className="font-medium text-foreground">{formatMXN(montoEsperado)}</span>
              </p>

              {/* Monto real */}
              <div className="flex flex-col gap-1.5 mb-3">
                <Label htmlFor="monto-real">Monto recibido</Label>
                <Input
                  id="monto-real"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>

              {/* Fecha real */}
              <div className="flex flex-col gap-1.5 mb-4">
                <Label htmlFor="fecha-real">Fecha de recepción</Label>
                <Input
                  id="fecha-real"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              {/* Selector de cuenta — obligatorio si el ingreso no tiene una asignada */}
              {!hasCuenta ? (
                <div className="flex flex-col gap-1.5 mb-4">
                  <Label htmlFor="cuenta-destino" className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-orange-500" />
                    ¿A qué cuenta llegó este dinero?
                    <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="cuenta-destino"
                    value={selectedCuentaId}
                    onChange={(e) => setSelectedCuentaId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="">— Selecciona una cuenta —</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    El saldo de la cuenta seleccionada se incrementará.
                  </p>
                </div>
              ) : (
                <p className="mb-4 text-xs text-muted-foreground">
                  Se sumará al saldo de:{' '}
                  <span className="font-medium text-foreground">{cuentaNombre}</span>
                </p>
              )}

              {esRecurrente && frecuencia && (
                <p className="mb-4 rounded-md bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                  Al confirmar se generará automáticamente la siguiente instancia ({frecuencia}).
                </p>
              )}

              {error && (
                <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button className="w-full" onClick={confirmar}>
                Confirmar recibido
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>

      {/* Modal de confirmación */}
      <ConfirmarAccionModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        titulo="¿Confirmar ingreso?"
        descripcion={(() => {
          const val = parseFloat(monto)
          const efectivaCuentaId = hasCuenta ? cuentaDestinoId! : selectedCuentaId
          const nombreCuenta =
            cuentas.find((c) => c.id === efectivaCuentaId)?.nombre ?? 'la cuenta seleccionada'
          return `¿Confirmar "${nombre}" por ${formatMXN(isNaN(val) ? 0 : val)}? Esto sumará ${formatMXN(isNaN(val) ? 0 : val)} al saldo de ${nombreCuenta}.`
        })()}
        labelConfirmar="Confirmar"
        onConfirm={ejecutarConfirmar}
        loading={isPending}
      />
    </Dialog.Root>
  )
}
