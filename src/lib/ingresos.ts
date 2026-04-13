import type { Database } from '@/types/database'

type Ingreso = Database['public']['Tables']['ingresos']['Row']

type Frecuencia = 'mensual' | 'quincenal' | 'semanal' | 'anual'

export function calcularSiguienteFechaIngreso(baseFecha: string, frecuencia: Frecuencia): string {
  const d = new Date(`${baseFecha}T12:00:00`)

  switch (frecuencia) {
    case 'mensual':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quincenal':
      d.setDate(d.getDate() + 15)
      break
    case 'semanal':
      d.setDate(d.getDate() + 7)
      break
    case 'anual':
      d.setFullYear(d.getFullYear() + 1)
      break
  }

  return d.toISOString().split('T')[0]
}

export function getProjectedRecurringIngresos(
  ingresos: Ingreso[],
  horizonDays = 30
): Ingreso[] {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + horizonDays)

  const ultimoPorNombre = new Map<string, Ingreso>()

  ingresos
    .filter((i) => i.estado === 'confirmado' && i.es_recurrente && i.frecuencia)
    .forEach((ingreso) => {
      const prev = ultimoPorNombre.get(ingreso.nombre)
      const fechaActual = ingreso.fecha_real ?? ingreso.fecha_esperada ?? ''
      const fechaPrev = prev ? (prev.fecha_real ?? prev.fecha_esperada ?? '') : ''

      if (!prev || fechaActual > fechaPrev) {
        ultimoPorNombre.set(ingreso.nombre, ingreso)
      }
    })

  const ingresosNoConfirmados = ingresos.filter((i) => i.estado !== 'confirmado')
  const projected: Ingreso[] = []

  for (const ingreso of ultimoPorNombre.values()) {
    const baseFecha = ingreso.fecha_real ?? ingreso.fecha_esperada
    if (!baseFecha || !ingreso.frecuencia) continue

    const siguienteFecha = calcularSiguienteFechaIngreso(baseFecha, ingreso.frecuencia)
    const nextDate = new Date(`${siguienteFecha}T12:00:00`)

    if (nextDate < hoy || nextDate > limite) continue

    const yaExiste = ingresosNoConfirmados.some(
      (candidate) =>
        candidate.nombre === ingreso.nombre &&
        candidate.fecha_esperada === siguienteFecha
    )

    if (yaExiste) continue

    projected.push({
      ...ingreso,
      id: `${ingreso.id}_next`,
      fecha_esperada: siguienteFecha,
      fecha_real: null,
      monto_real: null,
      estado: 'esperado',
    })
  }

  return projected
}
