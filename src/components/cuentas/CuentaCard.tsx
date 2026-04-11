'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Badge from '@/components/shared/Badge'
import CuentaForm from '@/components/cuentas/CuentaForm'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { eliminarCuenta, ajustarSaldo } from '@/app/(dashboard)/cuentas/actions'
import { formatMXN } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

const TIPO_LABEL: Record<string, string> = {
  banco: 'Banco',
  efectivo: 'Efectivo',
  digital: 'Digital',
  inversion: 'Inversión',
}

const TIPO_VARIANT: Record<string, BadgeVariant> = {
  banco: 'info',
  efectivo: 'success',
  digital: 'default',
  inversion: 'orange',
}

interface Props {
  cuenta: Cuenta
}

export default function CuentaCard({ cuenta }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bloqueadoOpen, setBloqueadoOpen] = useState(false)
  const [sincronizarOpen, setSincronizarOpen] = useState(false)
  const [saldoNuevoStr, setSaldoNuevoStr] = useState('')
  const [sincronizarError, setSincronizarError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSincronizandoPending, startSincronizarTransition] = useTransition()

  const saldo = Number(cuenta.saldo_actual ?? 0)
  const esInversion = cuenta.tipo === 'inversion'

  const saldoNuevoNum = saldoNuevoStr !== '' ? Number(saldoNuevoStr) : null
  const delta = saldoNuevoNum !== null ? saldoNuevoNum - saldo : null

  const handleDeleteClick = () => {
    if (saldo !== 0) {
      setBloqueadoOpen(true)
    } else {
      setDeleteOpen(true)
    }
  }

  const handleEliminar = () => {
    startTransition(async () => {
      await eliminarCuenta(cuenta.id)
      setDeleteOpen(false)
    })
  }

  const handleSincronizar = () => {
    if (saldoNuevoNum === null) return
    setSincronizarError(null)
    startSincronizarTransition(async () => {
      const result = await ajustarSaldo(cuenta.id, saldoNuevoNum)
      if (result.error) {
        setSincronizarError(result.error)
      } else {
        setSaldoNuevoStr('')
        setSincronizarError(null)
        setSincronizarOpen(false)
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border bg-card px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icono / color dot */}
          {cuenta.icono ? (
            <span className="text-xl shrink-0">{cuenta.icono}</span>
          ) : (
            <span
              className="size-3 rounded-full shrink-0 bg-muted-foreground/30"
              style={cuenta.color ? { backgroundColor: cuenta.color } : undefined}
            />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{cuenta.nombre}</span>
              <Badge variant={TIPO_VARIANT[cuenta.tipo] ?? 'default'}>
                {TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}
              </Badge>
              {cuenta.moneda !== 'MXN' && (
                <Badge variant="default">{cuenta.moneda}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-lg font-bold tabular-nums ${
              esInversion
                ? 'text-foreground'
                : saldo >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive'
            }`}
          >
            {formatMXN(saldo)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setSincronizarOpen(true)} title="Sincronizar saldo">
            <RefreshCw className="size-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleDeleteClick}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      <CuentaForm open={editOpen} onOpenChange={setEditOpen} cuenta={cuenta} />

      {/* Modal sincronizar saldo */}
      <Dialog.Root
        open={sincronizarOpen}
        onOpenChange={(next) => {
          if (!next) { setSaldoNuevoStr(''); setSincronizarError(null) }
          setSincronizarOpen(next)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
            aria-describedby="sincronizar-desc"
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <Dialog.Title className="text-base font-semibold leading-tight">
                Sincronizar saldo
                <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                  {cuenta.nombre}
                </span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            <Dialog.Description id="sincronizar-desc" className="sr-only">
              Ajusta el saldo actual de la cuenta al valor real del banco.
            </Dialog.Description>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="saldo-nuevo">Saldo real actual</Label>
                <Input
                  id="saldo-nuevo"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={saldoNuevoStr}
                  onChange={(e) => setSaldoNuevoStr(e.target.value)}
                  autoFocus
                />
              </div>

              {delta !== null && (
                <p className={`text-sm rounded-md px-3 py-2 ${
                  delta === 0
                    ? 'bg-muted text-muted-foreground'
                    : delta > 0
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  Esto ajustará el saldo de{' '}
                  <span className="font-semibold">{formatMXN(saldo)}</span> a{' '}
                  <span className="font-semibold">{formatMXN(saldoNuevoNum!)}</span>
                  {delta !== 0 && (
                    <span className="ml-1">
                      (diferencia de {delta > 0 ? '+' : ''}{formatMXN(delta)})
                    </span>
                  )}
                </p>
              )}

              {sincronizarError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {sincronizarError}
                </p>
              )}

              <Button
                className="w-full"
                onClick={handleSincronizar}
                disabled={saldoNuevoNum === null || delta === 0 || isSincronizandoPending}
              >
                {isSincronizandoPending ? 'Ajustando...' : 'Confirmar ajuste'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Eliminar — saldo cero */}
      <ConfirmarAccionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo="Eliminar cuenta"
        descripcion={`¿Eliminar "${cuenta.nombre}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        variante="destructive"
        onConfirm={handleEliminar}
        loading={isPending}
      />

      {/* Bloqueado — saldo > 0 */}
      <ConfirmarAccionModal
        open={bloqueadoOpen}
        onOpenChange={setBloqueadoOpen}
        titulo="No se puede eliminar"
        descripcion={`No puedes eliminar "${cuenta.nombre}" porque tiene un saldo de ${formatMXN(saldo)}. Transfiere el saldo a otra cuenta primero.`}
        labelConfirmar="Entendido"
        variante="default"
        onConfirm={() => setBloqueadoOpen(false)}
      />
    </>
  )
}
