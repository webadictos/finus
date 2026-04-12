'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import RegistrarGastoForm from '@/components/gastos/RegistrarGastoForm'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
}

export default function SidebarRegistrarGastoButton({ cuentas, tarjetas }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
      >
        <Plus className="size-4 shrink-0" />
        Registrar gasto
      </button>

      <RegistrarGastoForm
        open={open}
        onOpenChange={setOpen}
        cuentas={cuentas}
        tarjetas={tarjetas}
      />
    </>
  )
}
