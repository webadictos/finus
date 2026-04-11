'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import CuentaForm from '@/components/cuentas/CuentaForm'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { eliminarCuenta } from '@/app/(dashboard)/cuentas/actions'
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
  const [isPending, startTransition] = useTransition()

  const saldo = Number(cuenta.saldo_actual ?? 0)
  const esInversion = cuenta.tipo === 'inversion'

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
          <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleDeleteClick}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      <CuentaForm open={editOpen} onOpenChange={setEditOpen} cuenta={cuenta} />

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
