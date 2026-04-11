'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CompromisoForm from '@/components/compromisos/CompromisoForm'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  tarjetaId: string
  tarjetas: Tarjeta[]
}

export default function AgregarCompromisoTarjetaButton({ tarjetaId, tarjetas }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Agregar compromiso
      </Button>
      <CompromisoForm
        open={open}
        onOpenChange={setOpen}
        tarjetas={tarjetas}
        tarjetaIdFijo={tarjetaId}
      />
    </>
  )
}
