'use client'

import { useState, useTransition } from 'react'
import { Pencil, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import UndoBar from '@/components/shared/UndoBar'
import IngresoForm from '@/components/ingresos/IngresoForm'
import ConfirmarModal from '@/components/ingresos/ConfirmarModal'
import { deshacerConfirmarIngreso, acreditarIngreso } from '@/app/(dashboard)/ingresos/actions'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

// ─── Display helpers ──────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  fijo_recurrente: 'Fijo recurrente',
  proyecto_recurrente: 'Proyecto recurrente',
  unico: 'Único',
}

const TIPO_VARIANT: Record<string, BadgeVariant> = {
  fijo_recurrente: 'success',
  proyecto_recurrente: 'info',
  unico: 'default',
}

const PROB_VARIANT: Record<string, BadgeVariant> = {
  alta: 'success',
  media: 'warning',
  baja: 'error',
}

const ESTADO_LABEL: Record<string, { label: string; variant: BadgeVariant }> = {
  confirmado: { label: 'Confirmado', variant: 'success' },
  esperado: { label: 'Esperado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'warning' },
  en_riesgo: { label: 'En riesgo', variant: 'error' },
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UndoData = {
  ingresoId: string
  transaccionId: string
  nextIngresoId: string | null
  cuentaId: string | null
  monto: number
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface Props {
  ingreso: Ingreso
  cuentas: Cuenta[]
}

export default function IngresoCard({ ingreso, cuentas }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmarOpen, setConfirmarOpen] = useState(false)
  const [undoData, setUndoData] = useState<UndoData | null>(null)

  // Estado para el panel "Acreditar" (ingresos confirmados sin cuenta)
  const [acreditarCuentaId, setAcreditarCuentaId] = useState('')
  const [acreditarError, setAcreditarError] = useState<string | null>(null)
  const [acreditarPending, startAcreditar] = useTransition()

  const confirmado = ingreso.estado === 'confirmado'
  const monto = Number(ingreso.monto_esperado ?? 0)
  const montoReal = ingreso.monto_real != null ? Number(ingreso.monto_real) : null
  const dias = ingreso.fecha_esperada ? diasHastaFecha(ingreso.fecha_esperada) : null
  const estadoInfo = ESTADO_LABEL[ingreso.estado] ?? ESTADO_LABEL.esperado

  const necesitaAcreditar = confirmado && !ingreso.cuenta_destino_id

  const handleConfirmarSuccess = (data: {
    transaccionId: string
    nextIngresoId: string | null
    monto: number
    cuentaId: string | null
  }) => {
    setUndoData({
      ingresoId: ingreso.id,
      transaccionId: data.transaccionId,
      nextIngresoId: data.nextIngresoId,
      cuentaId: data.cuentaId,
      monto: data.monto,
    })
  }

  const handleUndo = async () => {
    if (!undoData) return { error: 'Sin datos para deshacer' }
    return deshacerConfirmarIngreso(
      undoData.ingresoId,
      undoData.transaccionId,
      undoData.cuentaId,
      undoData.monto,
      undoData.nextIngresoId
    )
  }

  const handleAcreditar = () => {
    if (!acreditarCuentaId) {
      setAcreditarError('Selecciona una cuenta')
      return
    }
    setAcreditarError(null)
    startAcreditar(async () => {
      const result = await acreditarIngreso(ingreso.id, acreditarCuentaId)
      if (result.error) {
        setAcreditarError(result.error)
      }
      // On success page revalidates, card disappears from "sin cuenta" state
    })
  }

  const selectClass =
    'h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30'

  return (
    <>
      <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            {/* Nombre + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{ingreso.nombre}</span>
              <Badge variant={TIPO_VARIANT[ingreso.tipo] ?? 'default'}>
                {TIPO_LABEL[ingreso.tipo] ?? ingreso.tipo}
              </Badge>
              <Badge variant={PROB_VARIANT[ingreso.probabilidad] ?? 'default'}>
                {ingreso.probabilidad}
              </Badge>
              {ingreso.es_recurrente && (
                <Badge variant="purple">
                  <RefreshCw className="mr-1 size-2.5" />
                  {ingreso.frecuencia ?? 'recurrente'}
                </Badge>
              )}
            </div>

            {/* Monto + fecha esperada */}
            {!confirmado && (
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMXN(monto)}
                </span>
                {ingreso.fecha_esperada && (
                  <span
                    className={`text-xs ${
                      dias !== null && dias < 0
                        ? 'text-destructive'
                        : dias !== null && dias <= 3
                        ? 'text-orange-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatFecha(ingreso.fecha_esperada)}
                    {dias !== null && (
                      <span className="ml-1">
                        {dias === 0
                          ? '(hoy)'
                          : dias < 0
                          ? `(hace ${Math.abs(dias)}d)`
                          : `(en ${dias}d)`}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            className="shrink-0"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>

        {/* Estado / confirmado */}
        {confirmado ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-emerald-500/10 px-3 py-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="text-sm">
                Recibido{' '}
                <span className="font-semibold">
                  {montoReal != null ? formatMXN(montoReal) : formatMXN(monto)}
                </span>
                {ingreso.fecha_real && (
                  <span className="ml-1 text-xs opacity-75">
                    el {formatFecha(ingreso.fecha_real)}
                  </span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Badge variant={estadoInfo.variant}>{estadoInfo.label}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmarOpen(true)}
            >
              Confirmar recibido
            </Button>
          </div>
        )}

        {/* Aviso: confirmado pero sin cuenta — acreditar */}
        {necesitaAcreditar && (
          <div className="flex flex-col gap-2 rounded-md border border-orange-300 bg-orange-500/10 px-3 py-3">
            <div className="flex items-start gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p className="text-xs leading-snug">
                <span className="font-semibold">No acreditado a ninguna cuenta.</span>{' '}
                ¿A cuál cuenta llegó este dinero?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={acreditarCuentaId}
                onChange={(e) => {
                  setAcreditarCuentaId(e.target.value)
                  setAcreditarError(null)
                }}
                className={`${selectClass} flex-1`}
              >
                <option value="">— Selecciona cuenta —</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleAcreditar}
                disabled={acreditarPending || !acreditarCuentaId}
              >
                {acreditarPending ? 'Acreditando…' : 'Acreditar'}
              </Button>
            </div>
            {acreditarError && (
              <p className="text-xs text-destructive">{acreditarError}</p>
            )}
          </div>
        )}

        {/* UndoBar */}
        {undoData && (
          <UndoBar
            mensaje="Ingreso confirmado"
            onUndo={handleUndo}
            onDismiss={() => setUndoData(null)}
          />
        )}
      </div>

      {/* Modales */}
      <IngresoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        ingreso={ingreso}
        cuentas={cuentas}
      />

      {!confirmado && (
        <ConfirmarModal
          open={confirmarOpen}
          onOpenChange={setConfirmarOpen}
          ingresoId={ingreso.id}
          nombre={ingreso.nombre}
          montoEsperado={monto}
          esRecurrente={ingreso.es_recurrente}
          frecuencia={ingreso.frecuencia}
          cuentas={cuentas}
          cuentaDestinoId={ingreso.cuenta_destino_id}
          onSuccess={handleConfirmarSuccess}
        />
      )}
    </>
  )
}
