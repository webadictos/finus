'use client'

import { useState } from 'react'
import { HandCoins, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PrestamoDadoCard from '@/components/compromisos/PrestamoDadoCard'
import PrestamoDadoForm from '@/components/compromisos/PrestamoDadoForm'
import type { Database } from '@/types/database'

type PrestamoDado = Database['public']['Tables']['prestamos_dados']['Row']
type Cuenta = Database['public']['Tables']['cuentas']['Row']

interface Props {
  prestamos: PrestamoDado[]
  cuentas: Cuenta[]
}

export default function PrestamoDadosSection({ prestamos, cuentas }: Props) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HandCoins className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Dinero que te deben</h2>
              <p className="text-xs text-muted-foreground">
                {prestamos.length} préstamo{prestamos.length !== 1 ? 's' : ''} activo{prestamos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-3.5" />
            Registrar préstamo dado
          </Button>
        </div>

        {prestamos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
            <HandCoins className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Sin préstamos registrados</p>
            <p className="text-xs text-muted-foreground">
              Lleva el control del dinero que le has prestado a otros
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {prestamos.map((p) => (
              <PrestamoDadoCard key={p.id} prestamo={p} cuentas={cuentas} />
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <PrestamoDadoForm open={formOpen} onOpenChange={setFormOpen} cuentas={cuentas} />
      )}
    </>
  )
}
