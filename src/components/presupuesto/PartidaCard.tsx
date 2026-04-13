'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, CheckCircle, X } from 'lucide-react'
import Badge from '@/components/shared/Badge'
import { formatMXN } from '@/lib/format'
import { aceptarSugerencia, ignorarSugerencia, eliminarPartida } from '@/app/(dashboard)/presupuesto/actions'
import type { Database } from '@/types/database'

type Partida = Database['public']['Tables']['presupuesto_operativo']['Row']

const FRECUENCIA_LABEL: Record<string, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
}

const CATEGORIA_LABEL: Record<string, string> = {
  comida: 'Comida',
  gasolina: 'Gasolina',
  despensa: 'Despensa',
  entretenimiento: 'Entretenimiento',
  mascotas: 'Mascotas',
  snacks: 'Snacks',
  transporte: 'Transporte',
  salud: 'Salud',
  varios: 'Varios',
}

interface Props {
  partida: Partida
  reservaAporte: number // cuánto aporta esta partida a la reserva de 7 días
  onEdit: (partida: Partida) => void
}

export default function PartidaCard({ partida, reservaAporte, onEdit }: Props) {
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const montoActivo =
    partida.fuente_activa === 'aprendido' && partida.monto_aprendido
      ? Number(partida.monto_aprendido)
      : Number(partida.monto_manual ?? 0)

  function handleAceptar() {
    startTransition(async () => { await aceptarSugerencia(partida.id) })
  }

  function handleIgnorar() {
    startTransition(async () => { await ignorarSugerencia(partida.id) })
  }

  function handleEliminar() {
    startTransition(async () => {
      await eliminarPartida(partida.id)
      setConfirmDelete(false)
    })
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-2">
      {/* Fila principal */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {CATEGORIA_LABEL[partida.categoria] ?? partida.categoria}
            </span>
            {partida.subcategoria && (
              <span className="text-xs text-muted-foreground">· {partida.subcategoria}</span>
            )}
            <Badge variant={partida.confianza === 'alta' ? 'success' : partida.confianza === 'media' ? 'warning' : 'default'}>
              {partida.confianza}
            </Badge>
            {partida.fuente_activa === 'aprendido' && (
              <Badge variant="info">aprendido</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {FRECUENCIA_LABEL[partida.frecuencia]} · reserva 7d: <span className="font-medium text-foreground">{formatMXN(reservaAporte)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-base font-bold tabular-nums">{formatMXN(montoActivo)}</p>
            <p className="text-[11px] text-muted-foreground">{FRECUENCIA_LABEL[partida.frecuencia].toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(partida)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Editar partida"
            >
              <Pencil className="size-3.5" />
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Eliminar partida"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEliminar}
                  disabled={pending}
                  className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sugerencia pendiente */}
      {partida.sugerencia_pendiente && partida.monto_sugerido && (
        <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 px-3 py-2.5 flex flex-col gap-2">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Llevo {partida.semanas_de_datos} semanas viendo tus gastos en{' '}
            <strong>{CATEGORIA_LABEL[partida.categoria] ?? partida.categoria}</strong>.
            Tu gasto real es <strong>{formatMXN(Number(partida.monto_sugerido))}/{partida.frecuencia}</strong>,
            no {formatMXN(montoActivo)}. ¿Actualizo tu presupuesto operativo?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAceptar}
              disabled={pending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="size-3.5" />
              Aceptar {formatMXN(Number(partida.monto_sugerido))}
            </button>
            <button
              onClick={handleIgnorar}
              disabled={pending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
