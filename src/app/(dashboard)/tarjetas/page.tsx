import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { CreditCard, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import NuevaTarjetaButton from '@/components/tarjetas/NuevaTarjetaButton'
import EditarTarjetaButton from '@/components/tarjetas/EditarTarjetaButton'
import EliminarTarjetaButton from '@/components/tarjetas/EliminarTarjetaButton'
import CopiarTarjetaButton from '@/components/tarjetas/CopiarTarjetaButton'
import Badge from '@/components/shared/Badge'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

export default async function TarjetasPage() {
  const supabase = await createClient()

  const [tarjetasRes, compromisosRes] = await Promise.all([
    supabase
      .from('tarjetas')
      .select('*')
      .eq('activa', true)
      .order('banco', { ascending: true })
      .order('nombre', { ascending: true }),
    supabase
      .from('compromisos')
      .select('tarjeta_id')
      .eq('activo', true)
      .not('tarjeta_id', 'is', null),
  ])

  const tarjetas: Tarjeta[] = tarjetasRes.data ?? []

  // Contar compromisos activos por tarjeta
  const compromisosPorTarjeta = (compromisosRes.data ?? []).reduce<Record<string, number>>(
    (acc, c) => {
      if (c.tarjeta_id) acc[c.tarjeta_id] = (acc[c.tarjeta_id] ?? 0) + 1
      return acc
    },
    {}
  )

  const credito = tarjetas.filter((t) => t.tipo === 'credito')
  const departamental = tarjetas.filter((t) => t.tipo === 'departamental')

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Tarjetas</h1>
          <p className="hidden md:block text-sm text-muted-foreground">
            Tus tarjetas de crédito y departamentales
          </p>
        </div>
        <NuevaTarjetaButton />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Crédito</p>
          <p className="text-lg font-bold tabular-nums">{credito.length}</p>
          <p className="text-xs text-muted-foreground">tarjetas activas</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Departamental</p>
          <p className="text-lg font-bold tabular-nums">{departamental.length}</p>
          <p className="text-xs text-muted-foreground">tarjetas activas</p>
        </div>
      </div>

      {/* Lista */}
      {tarjetas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <CreditCard className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin tarjetas registradas</p>
          <p className="text-xs text-muted-foreground">
            Agrega tus tarjetas para organizar tus compromisos
          </p>
          <NuevaTarjetaButton />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tarjetas.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{t.banco}</span>
                    <span className="text-sm text-muted-foreground">{t.nombre}</span>
                    <Badge variant={t.tipo === 'departamental' ? 'orange' : 'info'}>
                      {t.tipo === 'departamental' ? 'Departamental' : 'Crédito'}
                    </Badge>
                    <Badge variant="default">{t.titular_tipo}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <CopiarTarjetaButton tarjeta={t} />
                  <EditarTarjetaButton tarjeta={t} />
                  <EliminarTarjetaButton
                    tarjeta={t}
                    compromisosActivos={compromisosPorTarjeta[t.id] ?? 0}
                  />
                </div>
              </div>

              {/* Datos */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {t.limite_credito ? (
                  <span>
                    Límite{' '}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMXN(Number(t.limite_credito))}
                    </span>
                  </span>
                ) : null}
                {t.dia_corte != null && (
                  <span>
                    Corte día{' '}
                    <span className="font-medium text-foreground">{t.dia_corte}</span>
                  </span>
                )}
                {t.dia_limite_pago != null && (
                  <span>
                    Límite pago día{' '}
                    <span className="font-medium text-foreground">{t.dia_limite_pago}</span>
                  </span>
                )}
              </div>

              {/* Footer — link a compromisos */}
              <Link
                href="/compromisos"
                className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver compromisos
                <ArrowRight className="size-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
