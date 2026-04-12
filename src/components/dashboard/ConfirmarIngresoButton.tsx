'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import ConfirmarModal from '@/components/ingresos/ConfirmarModal'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Ingreso = Database['public']['Tables']['ingresos']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  ingreso: Ingreso
  cuentas: Cuenta[]
  className?: string
}

export function ConfirmarIngresoButton({ ingreso, cuentas, className }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400',
          className
        )}
      >
        <CheckCircle className="size-3.5" />
        Confirmar
      </button>

      <ConfirmarModal
        open={open}
        onOpenChange={setOpen}
        ingresoId={ingreso.id}
        nombre={ingreso.nombre}
        montoEsperado={Number(ingreso.monto_esperado ?? 0)}
        esRecurrente={ingreso.es_recurrente}
        frecuencia={ingreso.frecuencia}
        cuentas={cuentas}
        cuentaDestinoId={ingreso.cuenta_destino_id}
      />
    </>
  )
}
