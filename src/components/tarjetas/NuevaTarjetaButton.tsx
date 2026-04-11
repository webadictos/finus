'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TarjetaForm from '@/components/tarjetas/TarjetaForm'

export default function NuevaTarjetaButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus />
        Nueva tarjeta
      </Button>
      <TarjetaForm open={open} onOpenChange={setOpen} />
    </>
  )
}
