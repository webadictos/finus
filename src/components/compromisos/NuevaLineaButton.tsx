'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NuevaLineaForm from '@/components/compromisos/NuevaLineaForm'

export default function NuevaLineaButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        Nueva línea
      </Button>
      <NuevaLineaForm open={open} onOpenChange={setOpen} />
    </>
  )
}
