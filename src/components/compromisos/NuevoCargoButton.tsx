'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NuevoCargoForm from '@/components/compromisos/NuevoCargoForm'

interface Props {
  lineaId: string
  lineaNombre: string
}

export default function NuevoCargoButton({ lineaId, lineaNombre }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        Agregar cargo
      </Button>

      <NuevoCargoForm
        open={open}
        onOpenChange={setOpen}
        lineaId={lineaId}
        lineaNombre={lineaNombre}
      />
    </>
  )
}
