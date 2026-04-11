'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConfirmarAccionModal from '@/components/shared/ConfirmarAccionModal'
import { eliminarTarjeta } from '@/app/(dashboard)/tarjetas/actions'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  tarjeta: Tarjeta
  compromisosActivos: number
}

export default function EliminarTarjetaButton({ tarjeta, compromisosActivos }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleEliminar = () => {
    startTransition(async () => {
      await eliminarTarjeta(tarjeta.id)
      setOpen(false)
    })
  }

  const descripcion =
    compromisosActivos > 0
      ? `Esta tarjeta tiene ${compromisosActivos} compromiso${compromisosActivos > 1 ? 's' : ''} activo${compromisosActivos > 1 ? 's' : ''}. Al eliminarla los compromisos también se desactivarán. ¿Continuar?`
      : `¿Eliminar "${tarjeta.nombre}"? Esta acción no se puede deshacer.`

  return (
    <>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5 text-destructive" />
      </Button>

      <ConfirmarAccionModal
        open={open}
        onOpenChange={setOpen}
        titulo="Eliminar tarjeta"
        descripcion={descripcion}
        labelConfirmar="Eliminar"
        variante="destructive"
        onConfirm={handleEliminar}
        loading={isPending}
      />
    </>
  )
}
