'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import IngresoForm from '@/components/ingresos/IngresoForm'

export default function NuevoIngresoButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nuevo ingreso
      </Button>
      <IngresoForm open={open} onOpenChange={setOpen} />
    </>
  )
}
