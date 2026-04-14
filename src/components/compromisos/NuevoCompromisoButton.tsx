'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CompromisoForm from '@/components/compromisos/CompromisoForm'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  tarjetas: Tarjeta[]
  label?: string
}

export default function NuevoCompromisoButton({
  tarjetas,
  label = 'Nuevo compromiso',
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        {label}
      </Button>

      <CompromisoForm open={open} onOpenChange={setOpen} tarjetas={tarjetas} />
    </>
  )
}
