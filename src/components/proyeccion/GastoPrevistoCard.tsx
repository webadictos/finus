'use client'

import { useState } from 'react'
import { Pencil, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import GastoPrevistoForm from '@/components/proyeccion/GastoPrevistoForm'
import ConfirmarFechaModal from '@/components/proyeccion/ConfirmarFechaModal'
import { formatMXN, formatFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type GastoPrevisto = Database['public']['Tables']['gastos_previstos']['Row']

const TIPO_LABEL: Record<string, string> = {
  recurrente_aprox: 'Recurrente',
  previsto_sin_fecha: 'Sin fecha',
  eventual: 'Eventual',
}

const CERTEZA_VARIANT: Record<string, BadgeVariant> = {
  alta: 'success',
  media: 'warning',
  baja: 'default',
}

const CERTEZA_FACTOR: Record<string, number> = {
  alta: 1.0,
  media: 0.7,
  baja: 0.4,
}

interface Props {
  gasto: GastoPrevisto
}

export default function GastoPrevistoCard({ gasto }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmarOpen, setConfirmarOpen] = useState(false)

  const monto = Number(gasto.monto_estimado ?? 0)
  const factor = CERTEZA_FACTOR[gasto.certeza] ?? 0.7
  const montoPonderado = monto * factor
  const fechaDisplay = gasto.fecha_confirmada ?? gasto.fecha_sugerida

  return (
    <>
      <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{gasto.nombre}</span>
              <Badge variant="default">{TIPO_LABEL[gasto.tipo_programacion]}</Badge>
              <Badge variant={CERTEZA_VARIANT[gasto.certeza] ?? 'default'}>
                certeza {gasto.certeza}
              </Badge>
              {gasto.fecha_confirmada && (
                <Badge variant="info">fecha confirmada</Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tabular-nums text-destructive">
                {formatMXN(monto)}
              </span>
              {factor < 1 && (
                <span className="text-xs text-muted-foreground">
                  ponderado: {formatMXN(montoPonderado)}
                </span>
              )}
            </div>

            {/* Fecha */}
            <div className="text-xs text-muted-foreground">
              {fechaDisplay ? (
                <span>
                  {gasto.fecha_confirmada ? 'Confirmado para' : 'Aprox.'}{' '}
                  <span className="font-medium text-foreground">
                    {formatFecha(fechaDisplay)}
                  </span>
                </span>
              ) : gasto.mes ? (
                <span>Mes: {gasto.mes}</span>
              ) : (
                <span className="italic">Sin fecha definida</span>
              )}
              {gasto.frecuencia_dias && (
                <span className="ml-2 text-muted-foreground/70">
                  cada {gasto.frecuencia_dias}d
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Confirmar fecha */}
        {!gasto.fecha_confirmada && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setConfirmarOpen(true)}
          >
            <CalendarCheck className="size-3.5" />
            Confirmar fecha
          </Button>
        )}
      </div>

      <GastoPrevistoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        gasto={gasto}
      />
      <ConfirmarFechaModal
        open={confirmarOpen}
        onOpenChange={setConfirmarOpen}
        gastoId={gasto.id}
        nombre={gasto.nombre}
        fechaSugerida={gasto.fecha_sugerida}
        certeza={gasto.certeza}
      />
    </>
  )
}
