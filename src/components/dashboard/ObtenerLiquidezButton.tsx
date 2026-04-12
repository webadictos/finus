'use client'

import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ObtenerLiquidezForm from '@/components/dashboard/ObtenerLiquidezForm'
import type { Database } from '@/types/database'

type LineaCredito = Database['public']['Tables']['lineas_credito']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  lineas: LineaCredito[]
  cuentas: Cuenta[]
}

export default function ObtenerLiquidezButton({ lineas, cuentas }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Banknote className="size-4 mr-1.5" />
        Obtener liquidez
      </Button>

      <ObtenerLiquidezForm
        open={open}
        onOpenChange={setOpen}
        lineas={lineas}
        cuentas={cuentas}
      />
    </>
  )
}
