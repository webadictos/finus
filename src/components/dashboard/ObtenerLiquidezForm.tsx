'use client'

import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMXN } from '@/lib/format'
import {
  registrarDisposicionEfectivo,
  registrarPrestamoPersonal,
} from '@/app/(dashboard)/compromisos/actions'
import type { Database } from '@/types/database'

type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

type Origen = 'linea' | 'prestamo'
type ComoDevuelves = 'unico' | 'varios'
type Frecuencia = 'semanal' | 'quincenal' | 'mensual'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineas: LineaCredito[]
  cuentas: Cuenta[]
}

export default function ObtenerLiquidezForm({ open, onOpenChange, lineas, cuentas }: Props) {
  const [origen, setOrigen] = useState<Origen>('linea')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Estado rama línea ──────────────────────────────────────────
  const [lineaId, setLineaId] = useState('')
  const [monto, setMonto] = useState('')
  const [mensualidades, setMensualidades] = useState('')
  const [mensualidadOverride, setMensualidadOverride] = useState('')
  const [nombreLinea, setNombreLinea] = useState('Disposición de efectivo')
  const [cuentaDestinoId, setCuentaDestinoId] = useState('')

  // ── Estado rama préstamo ───────────────────────────────────────
  const [prestamista, setPrestamista] = useState('')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [montoDevolucion, setMontoDevolucion] = useState('')
  const [comoDevuelves, setComoDevuelves] = useState<ComoDevuelves>('unico')
  const [fechaDevolucion, setFechaDevolucion] = useState('')
  const [numPagos, setNumPagos] = useState('')
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual')
  const [cuentaDestinoIdP, setCuentaDestinoIdP] = useState('')

  const resetState = () => {
    setOrigen('linea')
    setError(null)
    setLineaId('')
    setMonto('')
    setMensualidades('')
    setMensualidadOverride('')
    setNombreLinea('Disposición de efectivo')
    setCuentaDestinoId('')
    setPrestamista('')
    setMontoRecibido('')
    setMontoDevolucion('')
    setComoDevuelves('unico')
    setFechaDevolucion('')
    setNumPagos('')
    setFrecuencia('mensual')
    setCuentaDestinoIdP('')
  }

  const handleOpenChange = (next: boolean) => {
    if (next) resetState()
    onOpenChange(next)
  }

  // ── Cálculos derivados (rama línea) ───────────────────────────
  const montoNum = parseFloat(monto)
  const mesesNum = parseInt(mensualidades)
  const mensualidadCalc =
    !isNaN(montoNum) && montoNum > 0 && !isNaN(mesesNum) && mesesNum > 0
      ? montoNum / mesesNum
      : null

  // ── Cálculos derivados (rama préstamo) ────────────────────────
  const montoRecibidoNum = parseFloat(montoRecibido)
  const montoDevolucionNum = parseFloat(montoDevolucion)
  const interesImplicito =
    !isNaN(montoRecibidoNum) &&
    !isNaN(montoDevolucionNum) &&
    montoDevolucionNum > montoRecibidoNum
      ? montoDevolucionNum - montoRecibidoNum
      : null
  const pctInteres =
    interesImplicito != null && montoRecibidoNum > 0
      ? (interesImplicito / montoRecibidoNum) * 100
      : null

  const numPagosNum = parseInt(numPagos)
  const montoPorPago =
    !isNaN(montoDevolucionNum) && !isNaN(numPagosNum) && numPagosNum > 0
      ? montoDevolucionNum / numPagosNum
      : null

  const FRECUENCIA_LABEL: Record<Frecuencia, string> = {
    semanal: 'semana',
    quincenal: 'quincena',
    mensual: 'mes',
  }

  const handleSubmit = () => {
    setError(null)
    const fd = new FormData()

    if (origen === 'linea') {
      fd.set('linea_credito_id', lineaId)
      fd.set('monto', monto)
      fd.set('mensualidades_totales', mensualidades || '1')
      if (mensualidadOverride) fd.set('monto_mensualidad', mensualidadOverride)
      fd.set('cuenta_destino_id', cuentaDestinoId)
      fd.set('nombre', nombreLinea)

      startTransition(async () => {
        const result = await registrarDisposicionEfectivo(fd)
        if (result.error) {
          setError(result.error)
        } else {
          onOpenChange(false)
        }
      })
    } else {
      fd.set('prestamista', prestamista)
      fd.set('monto_recibido', montoRecibido)
      fd.set('monto_devolucion', montoDevolucion || montoRecibido)
      fd.set('como_devuelves', comoDevuelves)
      fd.set('cuenta_destino_id', cuentaDestinoIdP)
      if (comoDevuelves === 'unico') {
        fd.set('fecha_devolucion', fechaDevolucion)
      } else {
        fd.set('num_pagos', numPagos)
        fd.set('frecuencia', frecuencia)
      }

      startTransition(async () => {
        const result = await registrarPrestamoPersonal(fd)
        if (result.error) {
          setError(result.error)
        } else {
          onOpenChange(false)
        }
      })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b px-5 py-4">
            <Dialog.Title className="text-base font-semibold leading-tight">
              Obtener liquidez
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5 flex-1">

            {/* PASO 1 — Origen */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                ¿De dónde viene el dinero?
              </legend>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="origen"
                  value="linea"
                  checked={origen === 'linea'}
                  onChange={() => setOrigen('linea')}
                  className="accent-primary"
                />
                <span className="text-sm">De una de mis líneas de crédito</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="origen"
                  value="prestamo"
                  checked={origen === 'prestamo'}
                  onChange={() => setOrigen('prestamo')}
                  className="accent-primary"
                />
                <span className="text-sm">Me lo presta alguien</span>
              </label>
            </fieldset>

            <div className="border-t" />

            {/* ── RAMA: Línea de crédito ───────────────────────────── */}
            {origen === 'linea' && (
              <>
                {/* Seleccionar línea */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linea_id">Línea de crédito</Label>
                  {lineas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tienes líneas de crédito registradas.</p>
                  ) : (
                    <select
                      id="linea_id"
                      value={lineaId}
                      onChange={(e) => setLineaId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                    >
                      <option value="">— Selecciona una línea —</option>
                      {lineas.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}{l.banco ? ` · ${l.banco}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Monto */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto-linea">¿Cuánto necesitas?</Label>
                  <Input
                    id="monto-linea"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => { setMonto(e.target.value); setMensualidadOverride('') }}
                  />
                </div>

                {/* Mensualidades */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mensualidades">¿A cuántos meses?</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mensualidades"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="12"
                      value={mensualidades}
                      onChange={(e) => { setMensualidades(e.target.value); setMensualidadOverride('') }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => { setMensualidades('1'); setMensualidadOverride('') }}
                    >
                      De contado
                    </Button>
                  </div>
                  {mensualidadCalc && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatMXN(mensualidadCalc)} / mes
                    </p>
                  )}
                </div>

                {/* Mensualidad override */}
                {mensualidades && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mensualidad-override">
                      Mensualidad
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        — edita si el banco redondea diferente
                      </span>
                    </Label>
                    <Input
                      id="mensualidad-override"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder={mensualidadCalc ? mensualidadCalc.toFixed(2) : '0.00'}
                      value={mensualidadOverride}
                      onChange={(e) => setMensualidadOverride(e.target.value)}
                    />
                  </div>
                )}

                {/* Cuenta destino */}
                {cuentas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cuenta-destino-linea">¿A qué cuenta llega el dinero?</Label>
                    <select
                      id="cuenta-destino-linea"
                      value={cuentaDestinoId}
                      onChange={(e) => setCuentaDestinoId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                    >
                      <option value="">— Solo registrar, sin acreditar —</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descripción */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nombre-linea">Descripción</Label>
                  <Input
                    id="nombre-linea"
                    placeholder="Disposición de efectivo"
                    value={nombreLinea}
                    onChange={(e) => setNombreLinea(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── RAMA: Préstamo personal ──────────────────────────── */}
            {origen === 'prestamo' && (
              <>
                {/* Prestamista */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prestamista">¿Quién te presta?</Label>
                  <Input
                    id="prestamista"
                    placeholder="ej. hermana, mamá, amigo Carlos"
                    value={prestamista}
                    onChange={(e) => setPrestamista(e.target.value)}
                  />
                </div>

                {/* Monto recibido */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto-recibido">¿Cuánto recibes?</Label>
                  <Input
                    id="monto-recibido"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={montoRecibido}
                    onChange={(e) => {
                      setMontoRecibido(e.target.value)
                      if (!montoDevolucion) setMontoDevolucion(e.target.value)
                    }}
                  />
                </div>

                {/* Monto a devolver */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto-devolucion">¿Cuánto vas a devolver?</Label>
                  <Input
                    id="monto-devolucion"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={montoDevolucion}
                    onChange={(e) => setMontoDevolucion(e.target.value)}
                  />
                  {interesImplicito != null && pctInteres != null && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Interés implícito: {formatMXN(interesImplicito)} ({pctInteres.toFixed(1)}%)
                    </p>
                  )}
                </div>

                {/* ¿Cómo devuelves? */}
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    ¿Cómo lo devuelves?
                  </legend>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="como-devuelves"
                      value="unico"
                      checked={comoDevuelves === 'unico'}
                      onChange={() => setComoDevuelves('unico')}
                      className="accent-primary"
                    />
                    <span className="text-sm">Un solo pago</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="como-devuelves"
                      value="varios"
                      checked={comoDevuelves === 'varios'}
                      onChange={() => setComoDevuelves('varios')}
                      className="accent-primary"
                    />
                    <span className="text-sm">Varios pagos</span>
                  </label>
                </fieldset>

                {/* Un solo pago */}
                {comoDevuelves === 'unico' && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fecha-devolucion">Fecha de devolución</Label>
                    <Input
                      id="fecha-devolucion"
                      type="date"
                      value={fechaDevolucion}
                      onChange={(e) => setFechaDevolucion(e.target.value)}
                    />
                  </div>
                )}

                {/* Varios pagos */}
                {comoDevuelves === 'varios' && (
                  <>
                    <div className="flex gap-3">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Label htmlFor="num-pagos">Número de pagos</Label>
                        <Input
                          id="num-pagos"
                          type="number"
                          min="2"
                          step="1"
                          placeholder="3"
                          value={numPagos}
                          onChange={(e) => setNumPagos(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Label htmlFor="frecuencia">Frecuencia</Label>
                        <select
                          id="frecuencia"
                          value={frecuencia}
                          onChange={(e) => setFrecuencia(e.target.value as Frecuencia)}
                          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                        >
                          <option value="semanal">Semanal</option>
                          <option value="quincenal">Quincenal</option>
                          <option value="mensual">Mensual</option>
                        </select>
                      </div>
                    </div>
                    {montoPorPago != null && (
                      <p className="text-xs text-muted-foreground">
                        {formatMXN(montoPorPago)} cada {FRECUENCIA_LABEL[frecuencia]}
                      </p>
                    )}
                  </>
                )}

                {/* Cuenta destino */}
                {cuentas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cuenta-destino-prestamo">¿A qué cuenta llega el dinero?</Label>
                    <select
                      id="cuenta-destino-prestamo"
                      value={cuentaDestinoIdP}
                      onChange={(e) => setCuentaDestinoIdP(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                    >
                      <option value="">— Solo registrar, sin acreditar —</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({formatMXN(Number(c.saldo_actual ?? 0))})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-4 flex gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" className="flex-1" disabled={isPending}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
