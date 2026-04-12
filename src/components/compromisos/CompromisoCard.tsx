'use client'

import { useState, useTransition } from 'react'
import { Pencil, CheckCircle2, Trash2, FileText } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import Badge from '@/components/shared/Badge'
import ProgressBar from '@/components/shared/ProgressBar'
import UndoBar from '@/components/shared/UndoBar'
import RecomendacionBadge from '@/components/compromisos/RecomendacionBadge'
import CompromisoForm from '@/components/compromisos/CompromisoForm'
import PagarModal from '@/components/compromisos/PagarModal'
import AcuerdoPagoForm from '@/components/compromisos/AcuerdoPagoForm'
import RegistrarAbonoModal from '@/components/compromisos/RegistrarAbonoModal'
import { deshacerMarcarPagado, eliminarCompromiso } from '@/app/(dashboard)/compromisos/actions'
import { getRecomendacion } from '@/lib/recommendations'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type Compromiso = Database['public']['Tables']['compromisos']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']
type AcuerdoPago = Database['public']['Tables']['acuerdos_pago']['Row']

interface Props {
  compromiso: Compromiso
  saldoDisponible: number
  tarjetas: Tarjeta[]
  cuentas: Cuenta[]
  /** Monto total pagado este mes para este compromiso, null si no se ha pagado */
  pagadoEsteMes: number | null
  /** Acuerdo de pago activo para este compromiso, si existe */
  acuerdo?: AcuerdoPago | null
}

// ─── Helpers de display ───────────────────────────────────────────────────────

const TIPO_PAGO_LABEL: Record<string, string> = {
  fijo: 'Fijo',
  revolvente: 'Revolvente',
  msi: 'MSI',
  prestamo: 'Préstamo',
  suscripcion: 'Suscripción',
  disposicion_efectivo: 'Efectivo',
}

const TIPO_PAGO_VARIANT: Record<string, BadgeVariant> = {
  fijo: 'default',
  revolvente: 'purple',
  msi: 'info',
  prestamo: 'orange',
  suscripcion: 'success',
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
  acuerdo = null,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [pagarOpen, setPagarOpen] = useState(false)
  const [acuerdoOpen, setAcuerdoOpen] = useState(false)
  const [abonoOpen, setAbonoOpen] = useState(false)
  const [undoData, setUndoData] = useState<UndoData | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSimpleOpen, setDeleteSimpleOpen] = useState(false)
  const [deleteLoading, startDeleteTransition] = useTransition()

  const esRecurrente =
    compromiso.tipo_pago === 'revolvente' ||
    compromiso.tipo_pago === 'fijo' ||
    (compromiso.mensualidades_restantes != null && compromiso.mensualidades_restantes > 1)

  const handleEliminar = (alcance: 'este_mes' | 'completo') => {
    startDeleteTransition(async () => {
      await eliminarCompromiso(compromiso.id, alcance)
      setDeleteOpen(false)
      setDeleteSimpleOpen(false)
    })
  }

  const monto = Number(compromiso.monto_mensualidad ?? 0)
  const pagoMin = compromiso.pago_minimo != null ? Number(compromiso.pago_minimo) : null
  const pagoSinInt =
    compromiso.pago_sin_intereses != null ? Number(compromiso.pago_sin_intereses) : null
  const dias = compromiso.fecha_proximo_pago
    ? diasHastaFecha(compromiso.fecha_proximo_pago)
    : null

  const showLiquidacion =
    compromiso.tipo_pago === 'msi' || compromiso.tipo_pago === 'prestamo'
  const mensualidadesRestantes =
    compromiso.mensualidades_restantes != null ? compromiso.mensualidades_restantes : null
  const mesTotales =
    compromiso.meses_totales != null ? compromiso.meses_totales : null
  const pagosRealizados =
    mesTotales != null && mensualidadesRestantes != null
      ? mesTotales - mensualidadesRestantes
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

  const tieneAcuerdo = acuerdo != null && acuerdo.activo && acuerdo.estado === 'activo'

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
              {tieneAcuerdo && (
                <Badge variant="warning">En acuerdo</Badge>
              )}
              {compromiso.prioridad && !tieneAcuerdo && (
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
            {/* Botón acuerdo de pago — solo para préstamos sin acuerdo activo */}
            {compromiso.tipo_pago === 'prestamo' && !tieneAcuerdo && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setAcuerdoOpen(true)}
                title="Registrar acuerdo de pago"
              >
                <FileText className="size-3.5 text-orange-500" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => esRecurrente ? setDeleteOpen(true) : setDeleteSimpleOpen(true)}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Acuerdo de pago activo */}
        {tieneAcuerdo ? (
          <div className="flex flex-col gap-2 rounded-lg border border-orange-300 bg-orange-500/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                Acuerdo de pago activo
              </p>
              <span className="text-xs text-orange-600">
                Límite: {formatFecha(acuerdo!.fecha_limite)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Acordado</p>
                <p className="font-semibold tabular-nums">{formatMXN(Number(acuerdo!.monto_acordado))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendiente</p>
                <p className="font-semibold tabular-nums text-destructive">
                  {formatMXN(Number(acuerdo!.monto_pendiente))}
                </p>
              </div>
            </div>
            <ProgressBar
              value={Number(acuerdo!.monto_acordado) - Number(acuerdo!.monto_pendiente)}
              max={Number(acuerdo!.monto_acordado)}
            />
          </div>
        ) : (
          <>
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
          </>
        )}

        {/* Liquidación: pagos restantes y barra de progreso (MSI / Préstamo) */}
        {showLiquidacion && !tieneAcuerdo && (mensualidadesRestantes != null || compromiso.fecha_fin_estimada) && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {mensualidadesRestantes != null && (
                <span>
                  <span className="font-medium text-foreground">{mensualidadesRestantes}</span> pago{mensualidadesRestantes !== 1 ? 's' : ''} restante{mensualidadesRestantes !== 1 ? 's' : ''}
                </span>
              )}
              {compromiso.fecha_fin_estimada && (
                <span>
                  Último pago: <span className="font-medium text-foreground">{formatFecha(compromiso.fecha_fin_estimada)}</span>
                </span>
              )}
            </div>
            {mesTotales != null && mensualidadesRestantes != null && pagosRealizados != null && (
              <ProgressBar value={pagosRealizados} max={mesTotales} />
            )}
          </div>
        )}

        {/* Footer: pagado / botón abono / marcar pagado */}
        {pagadoEsteMes != null ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Pagado este mes — <span className="font-semibold">{formatMXN(pagadoEsteMes)}</span>
            </span>
          </div>
        ) : tieneAcuerdo ? (
          <Button
            variant="outline"
            size="sm"
            className="self-start border-orange-400 text-orange-600 hover:bg-orange-50"
            onClick={() => setAbonoOpen(true)}
          >
            Registrar abono
          </Button>
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

      {/* Modal eliminar — compromiso recurrente */}
      <Dialog.Root open={deleteOpen} onOpenChange={deleteLoading ? undefined : setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
            aria-describedby="delete-recurrente-desc"
          >
            <Dialog.Title className="text-base font-semibold mb-1">Eliminar compromiso</Dialog.Title>
            <Dialog.Description id="delete-recurrente-desc" className="text-sm text-muted-foreground mb-5">
              <span className="font-medium text-foreground">{compromiso.nombre}</span> es un compromiso recurrente. ¿Cómo deseas eliminarlo?
            </Dialog.Description>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4" onClick={() => handleEliminar('este_mes')} disabled={deleteLoading}>
                <div className="text-left">
                  <p className="text-sm font-medium">Saltar este mes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avanza la fecha al mes siguiente. El compromiso sigue activo.</p>
                </div>
              </Button>
              <Button variant="destructive" className="w-full justify-start h-auto py-3 px-4" onClick={() => handleEliminar('completo')} disabled={deleteLoading}>
                <div className="text-left">
                  <p className="text-sm font-medium">{deleteLoading ? 'Eliminando...' : 'Eliminar completamente'}</p>
                  <p className="text-xs opacity-80 mt-0.5">Desactiva el compromiso. No se puede deshacer.</p>
                </div>
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost" className="w-full" disabled={deleteLoading}>Cancelar</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmarAccionModal
        open={deleteSimpleOpen}
        onOpenChange={setDeleteSimpleOpen}
        titulo="Eliminar compromiso"
        descripcion={`¿Eliminar "${compromiso.nombre}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        variante="destructive"
        onConfirm={() => handleEliminar('completo')}
        loading={deleteLoading}
      />

      <CompromisoForm open={editOpen} onOpenChange={setEditOpen} compromiso={compromiso} tarjetas={tarjetas} />

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

      <AcuerdoPagoForm
        open={acuerdoOpen}
        onOpenChange={setAcuerdoOpen}
        compromisoId={compromiso.id}
        compromisoNombre={compromiso.nombre}
      />

      {tieneAcuerdo && (
        <RegistrarAbonoModal
          open={abonoOpen}
          onOpenChange={setAbonoOpen}
          acuerdoId={acuerdo!.id}
          compromisoId={compromiso.id}
          compromisoNombre={compromiso.nombre}
          montoPendiente={Number(acuerdo!.monto_pendiente)}
          cuentas={cuentas}
        />
      )}
    </>
  )
}
