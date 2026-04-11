'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import IngresoForm from '@/components/ingresos/IngresoForm'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  cuentas: Cuenta[]
}

export default function NuevoIngresoButton({ cuentas }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nuevo ingreso
      </Button>
      <IngresoForm open={open} onOpenChange={setOpen} cuentas={cuentas} />
    </>
  )
}
