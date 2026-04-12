'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Badge from '@/components/shared/Badge'
import PagarLineaModal from '@/components/compromisos/PagarLineaModal'
import NuevoCargoForm from '@/components/compromisos/NuevoCargoForm'
import { formatMXN, formatFecha, diasHastaFecha } from '@/lib/format'
import type { Database } from '@/types/database'
import type { BadgeVariant } from '@/components/shared/Badge'

type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type CargoLinea = Database['public']['Tables']['cargos_linea']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  linea: LineaCredito
  cargos: CargoLinea[]
  cuentas: Cuenta[]
}

const TIPO_LINEA_LABEL: Record<string, string> = {
  tarjeta_credito: 'Crédito',
  linea_digital: 'Digital',
  bnpl: 'BNPL',
  departamental: 'Departamental',
}

const TIPO_CARGO_LABEL: Record<string, string> = {
  revolvente: 'Revolvente',
  msi: 'MSI',
  disposicion_efectivo: 'Disposición',
}

const TIPO_CARGO_VARIANT: Record<string, BadgeVariant> = {
  revolvente: 'purple',
  msi: 'info',
  disposicion_efectivo: 'error',
}

export default function LineaCreditoCard({ linea, cargos, cuentas }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [pagarOpen, setPagarOpen] = useState(false)
  const [cargoOpen, setCargoOpen] = useState(false)

  const pagoSinInt = linea.pago_sin_intereses != null ? Number(linea.pago_sin_intereses) : null
  const pagoMin = linea.pago_minimo != null ? Number(linea.pago_minimo) : null

  const dias = linea.fecha_proximo_pago ? diasHastaFecha(linea.fecha_proximo_pago) : null

  let urgenciaVariant: BadgeVariant | null = null
  let urgenciaLabel = ''
  if (dias !== null) {
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

  return (
    <>
      <div className="rounded-xl border bg-card">
        {/* Header (siempre visible) */}
        <div className="flex flex-col gap-2.5 px-5 pt-4 pb-3">
          {/* Fila 1: nombre, banco, badges, acciones */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-sm font-semibold">
                {linea.nombre}
                {linea.banco ? (
                  <span className="font-normal text-muted-foreground"> · {linea.banco}</span>
                ) : null}
              </span>
              <Badge variant={linea.tipo === 'departamental' ? 'orange' : 'default'}>
                {TIPO_LINEA_LABEL[linea.tipo] ?? linea.tipo}
              </Badge>
              {linea.titular_tipo !== 'personal' && (
                <Badge variant="purple">
                  {linea.titular_tipo.charAt(0).toUpperCase() + linea.titular_tipo.slice(1)}
                </Badge>
              )}
              {urgenciaVariant && (
                <Badge variant={urgenciaVariant}>{urgenciaLabel}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setPagarOpen(true)}
              >
                Registrar pago
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCargoOpen(true)}
                aria-label="Agregar cargo"
                title="Agregar cargo"
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'Colapsar cargos' : 'Ver cargos'}
              >
                {expanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Fila 2: montos de pago + fecha de vencimiento */}
          <div className="flex items-end gap-5 flex-wrap">
            {pagoSinInt != null && pagoSinInt > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Sin intereses</p>
                <p className="text-lg font-bold tabular-nums">{formatMXN(pagoSinInt)}</p>
              </div>
            )}
            {pagoMin != null && pagoMin > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className={`text-base font-semibold tabular-nums ${pagoSinInt ? 'text-muted-foreground' : ''}`}>
                  {formatMXN(pagoMin)}
                </p>
              </div>
            )}
            {!pagoSinInt && !pagoMin && (
              <p className="text-xs text-muted-foreground italic">Sin estado de cuenta</p>
            )}
            {linea.fecha_proximo_pago && (
              <p className="text-xs text-muted-foreground ml-auto self-center">
                Vence{' '}
                <span
                  className={`font-medium ${
                    dias !== null && dias <= 3 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {formatFecha(linea.fecha_proximo_pago)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Panel expandido: cargos activos */}
        {expanded && (
          <div className="border-t px-5 py-3 flex flex-col gap-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Cargos activos ({cargos.length})
            </p>
            {cargos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-1">Sin cargos registrados</p>
            ) : (
              cargos.map((cargo) => (
                <div
                  key={cargo.id}
                  className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={TIPO_CARGO_VARIANT[cargo.tipo] ?? 'default'}>
                      {TIPO_CARGO_LABEL[cargo.tipo] ?? cargo.tipo}
                    </Badge>
                    <span className="text-sm truncate">{cargo.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {cargo.tipo === 'msi' && cargo.monto_mensualidad != null ? (
                      <>
                        <span className="text-sm font-medium tabular-nums">
                          {formatMXN(Number(cargo.monto_mensualidad))}/mes
                        </span>
                        {cargo.mensualidades_restantes != null && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {cargo.mensualidades_restantes} rest.
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-medium tabular-nums">
                        {formatMXN(Number(cargo.saldo_pendiente ?? 0))}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setCargoOpen(true)}
              >
                <Plus className="size-3.5" />
                Agregar cargo
              </Button>
            </div>
          </div>
        )}
      </div>

      <NuevoCargoForm
        open={cargoOpen}
        onOpenChange={setCargoOpen}
        lineaId={linea.id}
        lineaNombre={linea.nombre}
      />

      <PagarLineaModal
        open={pagarOpen}
        onOpenChange={setPagarOpen}
        lineaId={linea.id}
        nombre={linea.nombre}
        pagoMinimo={pagoMin}
        pagoSinIntereses={pagoSinInt}
        cuentas={cuentas}
      />
    </>
  )
}
