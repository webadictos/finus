'use client'

import { useState } from 'react'
import { Pencil, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import ProgressBar from '@/components/shared/ProgressBar'
import UndoBar from '@/components/shared/UndoBar'
import RecomendacionBadge from '@/components/compromisos/RecomendacionBadge'
import CompromisoForm from '@/components/compromisos/CompromisoForm'
import PagarModal from '@/components/compromisos/PagarModal'
import { deshacerMarcarPagado } from '@/app/(dashboard)/compromisos/actions'
import { getRecomendacion } from '@/lib/recommendations'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  compromiso: Compromiso
  saldoDisponible: number
  tarjetas: Tarjeta[]
  cuentas: Cuenta[]
  /** Monto total pagado este mes para este compromiso, null si no se ha pagado */
  pagadoEsteMes: number | null
}

// ─── Helpers de display ───────────────────────────────────────────────────────

const TIPO_PAGO_LABEL: Record<string, string> = {
  fijo: 'Fijo',
  revolvente: 'Revolvente',
  msi: 'MSI',
  prestamo: 'Préstamo',
  disposicion_efectivo: 'Efectivo',
}

const TIPO_PAGO_VARIANT: Record<string, BadgeVariant> = {
  fijo: 'default',
  revolvente: 'purple',
  msi: 'info',
  prestamo: 'orange',
  disposicion_efectivo: 'error',
}

const PRIORIDAD_VARIANT: Record<string, BadgeVariant> = {
  alta: 'error',
  media: 'warning',
  baja: 'default',
}

// ─── Componente ──────────────────────────────────────────────────────────────

type UndoData = {
  transaccionId: string
  compromisoId: string
  fechaAnterior: string | null
  cuentaId: string | null
  monto: number
}

export default function CompromisoCard({
  compromiso,
  saldoDisponible,
  tarjetas,
  cuentas,
  pagadoEsteMes,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [pagarOpen, setPagarOpen] = useState(false)
  const [undoData, setUndoData] = useState<UndoData | null>(null)

  const monto = Number(compromiso.monto_mensualidad ?? 0)
  const pagoMin = compromiso.pago_minimo != null ? Number(compromiso.pago_minimo) : null
  const pagoSinInt =
    compromiso.pago_sin_intereses != null ? Number(compromiso.pago_sin_intereses) : null
  const dias = compromiso.fecha_proximo_pago
    ? diasHastaFecha(compromiso.fecha_proximo_pago)
    : null

  const recomendacion = getRecomendacion(
    {
      tipo_pago: compromiso.tipo_pago,
      saldo_real: compromiso.saldo_real != null ? Number(compromiso.saldo_real) : null,
      monto_mensualidad: monto,
      pago_minimo: pagoMin,
      pago_sin_intereses: pagoSinInt,
      mensualidades_restantes: compromiso.mensualidades_restantes,
      tasa_interes_anual:
        compromiso.tasa_interes_anual != null ? Number(compromiso.tasa_interes_anual) : null,
      fecha_proximo_pago: compromiso.fecha_proximo_pago,
      nombre: compromiso.nombre,
    },
    saldoDisponible
  )

  return (
    <>
      <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{compromiso.nombre}</span>
              <Badge variant={TIPO_PAGO_VARIANT[compromiso.tipo_pago] ?? 'default'}>
                {TIPO_PAGO_LABEL[compromiso.tipo_pago] ?? compromiso.tipo_pago}
              </Badge>
              {compromiso.prioridad && (
                <Badge variant={PRIORIDAD_VARIANT[compromiso.prioridad] ?? 'default'}>
                  {compromiso.prioridad}
                </Badge>
              )}
            </div>

            {/* Monto + fecha */}
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xl font-bold tabular-nums">{formatMXN(monto)}</span>
              {compromiso.fecha_proximo_pago && (
                <span
                  className={`text-xs ${
                    dias !== null && dias <= 1
                      ? 'text-destructive font-medium'
                      : dias !== null && dias <= 3
                      ? 'text-orange-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {formatFecha(compromiso.fecha_proximo_pago)}
                  {dias !== null && (
                    <span className="ml-1">
                      {dias === 0 ? '(hoy)' : dias < 0 ? `(hace ${Math.abs(dias)}d)` : `(en ${dias}d)`}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Barra de progreso saldo vs monto */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Saldo disponible: {formatMXN(saldoDisponible)}</span>
            <span>
              {saldoDisponible >= monto ? (
                <span className="text-emerald-600">Alcanza ✓</span>
              ) : (
                <span className="text-destructive">
                  Faltan {formatMXN(monto - saldoDisponible)}
                </span>
              )}
            </span>
          </div>
          <ProgressBar value={saldoDisponible} max={monto} />
        </div>

        {/* Recomendación */}
        <RecomendacionBadge recomendacion={recomendacion} />

        {/* Footer: pagado o botón */}
        {pagadoEsteMes != null ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Pagado este mes — <span className="font-semibold">{formatMXN(pagadoEsteMes)}</span>
            </span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setPagarOpen(true)}
          >
            Marcar pagado
          </Button>
        )}

        {/* UndoBar */}
        {undoData && (
          <UndoBar
            mensaje="Pago registrado"
            onUndo={() =>
              deshacerMarcarPagado(
                undoData.transaccionId,
                undoData.compromisoId,
                undoData.fechaAnterior,
                undoData.cuentaId,
                undoData.monto
              )
            }
            onDismiss={() => setUndoData(null)}
          />
        )}
      </div>

      {/* Modales */}
      <CompromisoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        compromiso={compromiso}
        tarjetas={tarjetas}
      />

      <PagarModal
        open={pagarOpen}
        onOpenChange={setPagarOpen}
        compromisoId={compromiso.id}
        nombre={compromiso.nombre}
        montoPrincipal={monto}
        pagoSinIntereses={pagoSinInt}
        pagoMinimo={pagoMin}
        esRevolvente={compromiso.tipo_pago === 'revolvente'}
        recomendacion={recomendacion}
        cuentas={cuentas}
        onSuccess={(data) =>
          setUndoData({
            transaccionId: data.transaccionId,
            compromisoId: compromiso.id,
            fechaAnterior: data.fechaAnterior,
            cuentaId: data.cuentaId,
            monto: data.monto,
          })
        }
      />
    </>
  )
}
