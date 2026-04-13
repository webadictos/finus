'use client'

import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMXN } from '@/lib/format'
import { calcularReservaOperativa } from '@/lib/presupuesto'
import PartidaCard from '@/components/presupuesto/PartidaCard'
import PartidaForm from '@/components/presupuesto/PartidaForm'
import type { Database } from '@/types/database'

type Partida = Database['public']['Tables']['presupuesto_operativo']['Row']

interface Props {
  partidas: Partida[]
}

const HORIZONTE_DIAS = 7

export default function PresupuestoClient({ partidas }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Partida | null>(null)

  const reservaTotal = calcularReservaOperativa(partidas, HORIZONTE_DIAS)

  function handleEdit(partida: Partida) {
    setEditando(partida)
    setFormOpen(true)
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open)
    if (!open) setEditando(null)
  }

  // Cuánto aporta cada partida a la reserva de 7 días
  function aportePorPartida(p: Partida): number {
    if (!p.activo) return 0
    const monto =
      p.fuente_activa === 'aprendido' && p.monto_aprendido
        ? Number(p.monto_aprendido)
        : Number(p.monto_manual ?? 0)
    const margen = p.confianza === 'baja' ? 1.2 : 1.0
    const factor =
      p.frecuencia === 'diario' ? HORIZONTE_DIAS
      : p.frecuencia === 'semanal' ? HORIZONTE_DIAS / 7
      : p.frecuencia === 'quincenal' ? HORIZONTE_DIAS / 15
      : HORIZONTE_DIAS / 30
    return monto * margen * factor
  }

  const sugerenciasPendientes = partidas.filter((p) => p.sugerencia_pendiente && p.monto_sugerido)

  return (
    <div className="flex flex-col gap-6">
      {/* KPI — Reserva operativa */}
      <div className="rounded-xl border bg-card px-5 py-4 flex items-start gap-4">
        <div className="mt-0.5 rounded-lg bg-emerald-500/10 p-2">
          <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reserva operativa — próximos 7 días
          </p>
          <p className="text-2xl font-bold tabular-nums mt-0.5">{formatMXN(reservaTotal)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se descuenta del saldo disponible antes de calcular recomendaciones de pago
          </p>
        </div>
      </div>

      {/* Sugerencias pendientes (banner global si hay más de una) */}
      {sugerenciasPendientes.length > 1 && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Tienes <strong>{sugerenciasPendientes.length} sugerencias</strong> de ajuste basadas en tus gastos reales.
            Revísalas abajo.
          </p>
        </div>
      )}

      {/* Header lista + botón */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Partidas
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {partidas.length} {partidas.length === 1 ? 'categoría' : 'categorías'} configuradas
          </p>
        </div>
        <Button onClick={() => { setEditando(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          Nueva partida
        </Button>
      </div>

      {/* Lista de partidas */}
      {partidas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <ShieldCheck className="size-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">Sin partidas configuradas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrega tus gastos básicos estimados para que Finus pueda reservar lo necesario
              antes de comprometer tu liquidez en pagos de deuda.
            </p>
          </div>
          <Button size="sm" variant="outline" className="mt-1" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            Agregar primera partida
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {partidas.map((p) => (
            <PartidaCard
              key={p.id}
              partida={p}
              reservaAporte={aportePorPartida(p)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <PartidaForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        partida={editando}
      />
    </div>
  )
}
