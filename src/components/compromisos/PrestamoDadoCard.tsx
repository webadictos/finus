'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Badge from '@/components/shared/Badge'
import ProgressBar from '@/components/shared/ProgressBar'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import PrestamoDadoForm from '@/components/compromisos/PrestamoDadoForm'
import {
  eliminarPrestamoDado,
  registrarAbonoPrestamoDado,
} from '@/app/(dashboard)/compromisos/actions'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type PrestamoDado = Database['public']['Tables']['prestamos_dados']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  prestamo: PrestamoDado
  cuentas: Cuenta[]
}

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  pendiente: 'warning',
  parcial: 'info',
  recuperado: 'success',
  incobrable: 'error',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  recuperado: 'Recuperado',
  incobrable: 'Incobrable',
}

export default function PrestamoDadoCard({ prestamo, cuentas }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [abonoOpen, setAbonoOpen] = useState(false)
  const [montoAbono, setMontoAbono] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [abonoError, setAbonoError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const montoPrestado = Number(prestamo.monto_prestado ?? 0)
  const montoARecuperar = Number(prestamo.monto_a_recuperar ?? 0)
  const montoRecuperado = Number(prestamo.monto_recuperado ?? 0)
  const pendiente = Math.max(0, montoARecuperar - montoRecuperado)

  const dias = prestamo.fecha_devolucion ? diasHastaFecha(prestamo.fecha_devolucion) : null

  let urgenciaVariant: BadgeVariant | null = null
  let urgenciaLabel = ''
  if (dias !== null && prestamo.estado !== 'recuperado') {
    if (dias <= 0) {
      urgenciaVariant = 'error'
      urgenciaLabel = dias === 0 ? 'Vence hoy' : `Venció hace ${Math.abs(dias)}d`
    } else if (dias <= 3) {
      urgenciaVariant = 'error'
      urgenciaLabel = `En ${dias}d`
    } else if (dias <= 7) {
      urgenciaVariant = 'warning'
      urgenciaLabel = `En ${dias}d`
    }
  }

  const handleAbono = () => {
    const val = parseFloat(montoAbono)
    if (isNaN(val) || val <= 0) {
      setAbonoError('Ingresa un monto válido')
      return
    }
    setAbonoError(null)

    startTransition(async () => {
      const result = await registrarAbonoPrestamoDado(
        prestamo.id,
        val,
        cuentaId || null
      )
      if (result.error) {
        setAbonoError(result.error)
      } else {
        setAbonoOpen(false)
        setMontoAbono('')
        setCuentaId('')
      }
    })
  }

  const handleEliminar = () => {
    startTransition(async () => {
      const result = await eliminarPrestamoDado(prestamo.id)
      if (result.error) {
        setAbonoError(result.error)
      } else {
        setDeleteOpen(false)
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold">{prestamo.deudor}</span>
            <Badge variant={ESTADO_VARIANT[prestamo.estado] ?? 'default'}>
              {ESTADO_LABEL[prestamo.estado] ?? prestamo.estado}
            </Badge>
            {urgenciaVariant && <Badge variant={urgenciaVariant}>{urgenciaLabel}</Badge>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {prestamo.estado !== 'recuperado' && prestamo.estado !== 'incobrable' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5 shrink-0"
                onClick={() => { setAbonoOpen(true); setMontoAbono(String(pendiente)) }}
              >
                Registrar abono
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Montos */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Prestado{' '}
            <span className="font-medium text-foreground tabular-nums">
              {formatMXN(montoPrestado)}
            </span>
          </span>
          {montoARecuperar !== montoPrestado && (
            <span>
              A recuperar{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatMXN(montoARecuperar)}
              </span>
            </span>
          )}
          {montoRecuperado > 0 && (
            <span>
              Recuperado{' '}
              <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatMXN(montoRecuperado)}
              </span>
            </span>
          )}
          {pendiente > 0 && (
            <span>
              Pendiente{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatMXN(pendiente)}
              </span>
            </span>
          )}
          {prestamo.fecha_devolucion && (
            <span>
              Fecha{' '}
              <span
                className={`font-medium ${
                  urgenciaVariant === 'error' ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {formatFecha(prestamo.fecha_devolucion)}
              </span>
            </span>
          )}
        </div>

        {/* Barra de progreso: recuperado / a recuperar */}
        {montoARecuperar > 0 && (
          <ProgressBar value={montoRecuperado} max={montoARecuperar} />
        )}

        {prestamo.notas && (
          <p className="text-xs text-muted-foreground italic">{prestamo.notas}</p>
        )}
      </div>

      {/* Modal de abono */}
      {editOpen && (
        <PrestamoDadoForm
          open={editOpen}
          onOpenChange={setEditOpen}
          cuentas={cuentas}
          prestamo={prestamo}
        />
      )}

      <Dialog.Root open={abonoOpen} onOpenChange={(v) => { if (!isPending) { setAbonoOpen(v); if (!v) { setMontoAbono(''); setCuentaId(''); setAbonoError(null) } } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
            aria-describedby={undefined}
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <Dialog.Title className="text-base font-semibold leading-tight">
                Registrar abono
                <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                  {prestamo.deudor}
                </span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`abono-monto-${prestamo.id}`}>Monto recibido</Label>
                <Input
                  id={`abono-monto-${prestamo.id}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Pendiente: {formatMXN(pendiente)}
                </p>
              </div>

              {cuentas.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`abono-cuenta-${prestamo.id}`}>Acreditar a cuenta</Label>
                  <select
                    id={`abono-cuenta-${prestamo.id}`}
                    value={cuentaId}
                    onChange={(e) => setCuentaId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                  >
                    <option value="">— Solo registrar —</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {abonoError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {abonoError}
                </p>
              )}

              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline" className="flex-1" disabled={isPending}>
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button className="flex-1" onClick={handleAbono} disabled={isPending}>
                  {isPending ? 'Guardando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmarAccionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo="Eliminar préstamo dado"
        descripcion={`¿Ocultar el registro de "${prestamo.deudor}"? Esto dejará de mostrarlo en "Dinero que te deben", pero no modificará tu historial de transacciones.`}
        labelConfirmar="Eliminar"
        variante="destructive"
        onConfirm={handleEliminar}
        loading={isPending}
      />
    </>
  )
}
