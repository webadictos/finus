'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CompromisoForm from '@/components/compromisos/CompromisoForm'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  tarjetas: Tarjeta[]
}

export default function NuevoCompromisoButton({ tarjetas }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nuevo compromiso
      </Button>

      <CompromisoForm open={open} onOpenChange={setOpen} tarjetas={tarjetas} />
    </>
  )
}
