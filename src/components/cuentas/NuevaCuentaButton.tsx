'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CuentaForm from '@/components/cuentas/CuentaForm'

interface Props {
  tipoDefault?: string
  label?: string
  variant?: 'default' | 'outline'
}

export default function NuevaCuentaButton({
  tipoDefault,
  label = 'Nueva cuenta',
  variant = 'default',
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4 mr-1.5" />
        {label}
      </Button>

      <CuentaForm open={open} onOpenChange={setOpen} tipoDefault={tipoDefault} />
    </>
  )
}
