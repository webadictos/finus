'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import CuentaForm from '@/components/cuentas/CuentaForm'
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

  const saldo = Number(cuenta.saldo_actual ?? 0)
  const esInversion = cuenta.tipo === 'inversion'

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
        </div>
      </div>

      <CuentaForm open={editOpen} onOpenChange={setEditOpen} cuenta={cuenta} />
    </>
  )
}
