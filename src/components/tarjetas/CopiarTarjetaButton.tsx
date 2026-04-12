'use client'

import { useState } from 'react'
import { CopyPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NuevaLineaForm from '@/components/compromisos/NuevaLineaForm'
import type { Database } from '@/types/database'

type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  tarjeta: Tarjeta
}

export default function CopiarTarjetaButton({ tarjeta: t }: Props) {
  const [open, setOpen] = useState(false)

  // tasa_interes_mensual → tasa_interes_anual (multiplicar ×12)
  const tasaAnual =
    t.tasa_interes_mensual != null ? Number(t.tasa_interes_mensual) * 12 : null

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Copiar a líneas de crédito"
        title="Copiar a líneas de crédito"
      >
        <CopyPlus className="size-4" />
      </Button>

      <NuevaLineaForm
        open={open}
        onOpenChange={setOpen}
        initialValues={{
          nombre: t.nombre,
          banco: t.banco,
          tipo: 'tarjeta_credito',
          titular_tipo: t.titular_tipo,
          titular_nombre: t.titular_nombre ?? undefined,
          ultimos_4: t.ultimos_4 ?? undefined,
          limite_credito: t.limite_credito != null ? Number(t.limite_credito) : null,
          saldo_al_corte: t.saldo_al_corte != null ? Number(t.saldo_al_corte) : null,
          pago_sin_intereses: t.pago_sin_intereses != null ? Number(t.pago_sin_intereses) : null,
          pago_minimo: t.pago_minimo != null ? Number(t.pago_minimo) : null,
          dia_corte: t.dia_corte,
          dia_limite_pago: t.dia_limite_pago,
          tasa_interes_anual: tasaAnual,
        }}
      />
    </>
  )
}
