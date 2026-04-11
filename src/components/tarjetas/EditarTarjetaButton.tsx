'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TarjetaForm from '@/components/tarjetas/TarjetaForm'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  tarjeta: Tarjeta
}

export default function EditarTarjetaButton({ tarjeta }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
      </Button>
      <TarjetaForm open={open} onOpenChange={setOpen} tarjeta={tarjeta} />
    </>
  )
}
