'use client'

import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TransferenciaForm from '@/components/cuentas/TransferenciaForm'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  cuentas: Cuenta[]
  label?: string
  variant?: 'default' | 'outline'
}

export default function NuevaTransferenciaButton({
  cuentas,
  label = 'Transferir entre cuentas',
  variant = 'outline',
}: Props) {
  const [open, setOpen] = useState(false)

  // Necesita al menos 2 cuentas para habilitar la transferencia
  const disabled = cuentas.length < 2

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? 'Necesitas al menos 2 cuentas para transferir' : undefined}
      >
        <ArrowLeftRight className="size-4 mr-1.5" />
        {label}
      </Button>

      {!disabled && (
        <TransferenciaForm open={open} onOpenChange={setOpen} cuentas={cuentas} />
      )}
    </>
  )
}
