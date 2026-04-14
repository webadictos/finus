import type {
  CompromisoParaRecomendacion,
  IngresoProximo,
  Recomendacion,
  ColorRecomendacion,
  LineaParaRecomendacion,
} from '@/types/finus'
import { formatFecha } from '@/lib/format'

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Porcentaje del saldo mínimo que se reserva como colchón de seguridad */
const FACTOR_COLCHON = 0.20

/** Días hacia adelante para considerar un ingreso "próximo" */
const DIAS_VENTANA_INGRESO = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMXN(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
}

function calcularInteresEstimado(
  monto: number,
  tasaMensual: number | null
): number | null {
  if (!tasaMensual || tasaMensual <= 0) return null
  return Math.round(monto * (tasaMensual / 100))
}

/**
 * Devuelve el ingreso más próximo antes del vencimiento del compromiso,
 * si existe dentro de la ventana definida.
 */
function ingresoAntesDelVencimiento(
  fechaVencimiento: string | null,
  ingresoProximo: IngresoProximo | null
): IngresoProximo | null {
  if (!fechaVencimiento || !ingresoProximo?.fecha_esperada) return null

  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const fechaIngreso = new Date(ingresoProximo.fecha_esperada)

  // El ingreso debe llegar antes del vencimiento y dentro de la ventana
  const diasHastaIngreso = Math.ceil(
    (fechaIngreso.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (
    fechaIngreso < vencimiento &&
    diasHastaIngreso >= 0 &&
    diasHastaIngreso <= DIAS_VENTANA_INGRESO
  ) {
    return ingresoProximo
  }

  return null
}

// ─── Lógica por tipo de pago ──────────────────────────────────────────────────

function recomendarFijo(
  compromiso: CompromisoParaRecomendacion,
  saldo: number
): Recomendacion {
  const monto = Number(compromiso.monto_mensualidad ?? compromiso.saldo_real ?? 0)

  if (saldo >= monto) {
    return {
      accion: 'Realiza el pago completo',
      detalle: `${compromiso.nombre} requiere pago fijo de ${formatMXN(monto)}`,
      color: 'verde',
      monto_sugerido: monto,
      monto_minimo: monto,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  return {
    accion: 'Fondos insuficientes para el pago fijo',
    detalle: `Necesitas ${formatMXN(monto)} pero tienes ${formatMXN(saldo)}`,
    color: 'rojo_fuerte',
    monto_sugerido: monto,
    monto_minimo: monto,
    interes_estimado_mensual: null,
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

function recomendarMSI(
  compromiso: CompromisoParaRecomendacion,
  saldo: number
): Recomendacion {
  const mensualidad = Number(compromiso.monto_mensualidad ?? 0)

  if (saldo >= mensualidad) {
    return {
      accion: `Paga la mensualidad MSI — obligatorio`,
      detalle: `${compromiso.mensualidades_restantes ?? '?'} meses sin intereses. No pagar genera intereses retroactivos.`,
      color: 'verde',
      monto_sugerido: mensualidad,
      monto_minimo: mensualidad,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  return {
    accion: 'Alerta: mensualidad MSI sin fondos',
    detalle: `Necesitas ${formatMXN(mensualidad)}. No pagar cancela el plan sin intereses.`,
    color: 'rojo_fuerte',
    monto_sugerido: mensualidad,
    monto_minimo: mensualidad,
    interes_estimado_mensual: null,
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

function recomendarPrestamo(
  compromiso: CompromisoParaRecomendacion,
  saldo: number
): Recomendacion {
  const cuota = Number(compromiso.monto_mensualidad ?? compromiso.pago_minimo ?? 0)

  if (saldo >= cuota) {
    return {
      accion: 'Paga la cuota del préstamo',
      detalle: `Cuota fija de ${formatMXN(cuota)}`,
      color: 'verde',
      monto_sugerido: cuota,
      monto_minimo: cuota,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  return {
    accion: 'Sin fondos para la cuota del préstamo',
    detalle: `Necesitas ${formatMXN(cuota)} — considera refinanciamiento`,
    color: 'rojo_fuerte',
    monto_sugerido: cuota,
    monto_minimo: cuota,
    interes_estimado_mensual: null,
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

function recomendarRevolvente(
  compromiso: CompromisoParaRecomendacion,
  saldo: number,
  ingresoProximo: IngresoProximo | null
): Recomendacion {
  const montoTotal = Number(compromiso.saldo_real ?? 0)
  const pagoSinIntereses = Number(compromiso.pago_sin_intereses ?? 0)
  const minimo = Number(compromiso.monto_mensualidad ?? compromiso.pago_minimo ?? 0)
  const colchon = Math.ceil(minimo * FACTOR_COLCHON)
  const tasaMensual = compromiso.tasa_interes_anual != null ? Number(compromiso.tasa_interes_anual) / 12 : null

  // Caso 1: Liquidación total posible
  if (montoTotal > 0 && saldo >= montoTotal) {
    return {
      accion: 'Liquídala — cierra esta deuda hoy',
      detalle: `Tienes suficiente para saldar los ${formatMXN(montoTotal)} completos`,
      color: 'verde',
      monto_sugerido: montoTotal,
      monto_minimo: minimo,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 2: Pago de corte sin intereses
  if (pagoSinIntereses > 0 && saldo >= pagoSinIntereses) {
    return {
      accion: 'Paga el corte completo — sin intereses',
      detalle: `Pago de ${formatMXN(pagoSinIntereses)} cubre el periodo sin generar intereses`,
      color: 'amarillo',
      monto_sugerido: pagoSinIntereses,
      monto_minimo: minimo,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 3: Entre mínimo+colchón y pago sin intereses
  if (minimo > 0 && saldo >= minimo + colchon) {
    const montoMaximo = pagoSinIntereses > 0
      ? Math.min(saldo, pagoSinIntereses - 1)
      : saldo
    const interesEstimado = calcularInteresEstimado(
      montoTotal - minimo,
      tasaMensual
    )

    return {
      accion: `Paga entre ${formatMXN(minimo + colchon)} y ${formatMXN(montoMaximo)}`,
      detalle: interesEstimado
        ? `Pagar más reduce intereses. Si pagas el mínimo: ${formatMXN(interesEstimado)}/mes en intereses`
        : `Paga lo más que puedas para reducir el saldo`,
      color: 'naranja',
      monto_sugerido: montoMaximo,
      monto_minimo: minimo,
      interes_estimado_mensual: interesEstimado,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 4: Solo alcanza el mínimo
  if (minimo > 0 && saldo >= minimo) {
    const interesEstimado = calcularInteresEstimado(
      montoTotal - minimo,
      tasaMensual
    )

    return {
      accion: 'Paga el mínimo',
      detalle: interesEstimado
        ? `Interés estimado: ${formatMXN(interesEstimado)}/mes sobre el saldo restante`
        : `Solo cubre el pago mínimo requerido`,
      color: 'rojo',
      monto_sugerido: minimo,
      monto_minimo: minimo,
      interes_estimado_mensual: interesEstimado,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 5: Ingreso próximo llega antes del vencimiento
  const ingreso = ingresoAntesDelVencimiento(
    compromiso.fecha_proximo_pago,
    ingresoProximo
  )
  if (ingreso) {
    return {
      accion: `Espera al ${formatFecha(ingreso.fecha_esperada)} — llega ${ingreso.nombre}`,
      detalle: `Ingreso de ${formatMXN(ingreso.monto)} llega antes del vencimiento`,
      color: 'morado',
      monto_sugerido: minimo,
      monto_minimo: minimo,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: ingreso.fecha_esperada,
      nombre_ingreso_proximo: ingreso.nombre,
    }
  }

  // Caso 6: Sin liquidez y sin ingreso próximo
  return {
    accion: 'No pagues hoy — sin liquidez',
    detalle: `Saldo insuficiente para el mínimo (${formatMXN(minimo)}). Evalúa renegociar o buscar fondos.`,
    color: 'rojo_fuerte',
    monto_sugerido: null,
    monto_minimo: minimo,
    interes_estimado_mensual: calcularInteresEstimado(montoTotal, Number(tasaMensual)),
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

function recomendarSuscripcion(
  compromiso: CompromisoParaRecomendacion,
  saldo: number
): Recomendacion {
  const monto = Number(compromiso.monto_mensualidad ?? 0)

  if (saldo >= monto) {
    return {
      accion: 'Pago automático — verifica saldo suficiente',
      detalle: `El cobro de ${formatMXN(monto)} se realizará automáticamente. Asegúrate de tener saldo en la cuenta o tarjeta vinculada.`,
      color: 'verde',
      monto_sugerido: monto,
      monto_minimo: monto,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  return {
    accion: 'Saldo insuficiente — el cobro automático podría fallar',
    detalle: `Necesitas ${formatMXN(monto)} disponibles para el cargo automático de ${compromiso.nombre}.`,
    color: 'rojo_fuerte',
    monto_sugerido: monto,
    monto_minimo: monto,
    interes_estimado_mensual: null,
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

function recomendarDisposicion(
  compromiso: CompromisoParaRecomendacion,
  saldo: number
): Recomendacion {
  // La disposición de efectivo tiene intereses desde el día 1, tratar como préstamo
  const cuota = Number(compromiso.monto_mensualidad ?? compromiso.pago_minimo ?? 0)
  const saldoReal = Number(compromiso.saldo_real ?? 0)
  const tasaMensualDisp = compromiso.tasa_interes_anual != null ? Number(compromiso.tasa_interes_anual) / 12 : null
  const interesEstimado = calcularInteresEstimado(saldoReal, tasaMensualDisp)

  if (saldo >= saldoReal && saldoReal > 0) {
    return {
      accion: 'Liquída la disposición — intereses diarios activos',
      detalle: `Genera intereses desde el primer día. Saldar hoy: ${formatMXN(saldoReal)}`,
      color: 'verde',
      monto_sugerido: saldoReal,
      monto_minimo: cuota,
      interes_estimado_mensual: interesEstimado,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  if (saldo >= cuota) {
    return {
      accion: 'Paga la cuota de disposición',
      detalle: interesEstimado
        ? `Intereses activos: ~${formatMXN(interesEstimado)}/mes. Liquida cuanto antes.`
        : 'Genera intereses diarios — prioriza liquidar',
      color: 'naranja',
      monto_sugerido: cuota,
      monto_minimo: cuota,
      interes_estimado_mensual: interesEstimado,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  return {
    accion: 'Sin fondos — disposición generando intereses',
    detalle: `Necesitas al menos ${formatMXN(cuota)}. Los intereses siguen corriendo.`,
    color: 'rojo_fuerte',
    monto_sugerido: null,
    monto_minimo: cuota,
    interes_estimado_mensual: interesEstimado,
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Genera una recomendación de pago para un compromiso dado el saldo disponible.
 *
 * @param compromiso       - El compromiso a evaluar
 * @param saldoDisponible  - Saldo líquido bruto
 * @param ingresoProximo   - Próximo ingreso esperado (opcional, para el caso "espera al...")
 * @param reservaOperativa - Monto a reservar para gastos básicos antes de comprometer liquidez.
 *                           Se descuenta de saldoDisponible. Default: 0.
 */
export function getRecomendacion(
  compromiso: CompromisoParaRecomendacion,
  saldoDisponible: number,
  ingresoProximo: IngresoProximo | null = null,
  reservaOperativa = 0
): Recomendacion {
  const saldoLibre = saldoDisponible - reservaOperativa

  switch (compromiso.tipo_pago) {
    case 'fijo':
      return recomendarFijo(compromiso, saldoLibre)

    case 'msi':
      return recomendarMSI(compromiso, saldoLibre)

    case 'prestamo':
      return recomendarPrestamo(compromiso, saldoLibre)

    case 'revolvente':
      return recomendarRevolvente(compromiso, saldoLibre, ingresoProximo)

    case 'disposicion_efectivo':
      return recomendarDisposicion(compromiso, saldoLibre)

    case 'suscripcion':
      return recomendarSuscripcion(compromiso, saldoLibre)

    default: {
      const _exhaustive: never = compromiso.tipo_pago
      throw new Error(`Tipo de pago no reconocido: ${_exhaustive}`)
    }
  }
}

/**
 * Calcula el color de prioridad para ordenar compromisos en el dashboard.
 * Mayor número = mayor urgencia.
 */
export function getPrioridadColor(color: ColorRecomendacion): number {
  const prioridades: Record<ColorRecomendacion, number> = {
    rojo_fuerte: 5,
    rojo: 4,
    naranja: 3,
    morado: 2,
    amarillo: 1,
    verde: 0,
  }
  return prioridades[color]
}

/**
 * Genera recomendaciones para una lista de compromisos, ordenados por urgencia.
 */
export function getRecomendaciones(
  compromisos: CompromisoParaRecomendacion[],
  saldoDisponible: number,
  ingresoProximo: IngresoProximo | null = null,
  reservaOperativa = 0
): Array<{ compromiso: CompromisoParaRecomendacion; recomendacion: Recomendacion }> {
  const resultados = compromisos.map((compromiso) => ({
    compromiso,
    recomendacion: getRecomendacion(compromiso, saldoDisponible, ingresoProximo, reservaOperativa),
  }))

  return resultados.sort(
    (a, b) =>
      getPrioridadColor(b.recomendacion.color) -
      getPrioridadColor(a.recomendacion.color)
  )
}

// ─── Líneas de crédito ────────────────────────────────────────────────────────

function recomendarLinea(
  linea: LineaParaRecomendacion,
  saldo: number,
  ingresoProximo: IngresoProximo | null
): Recomendacion {
  const saldoTotal = Number(linea.saldo_al_corte ?? 0)
  const pagoSinIntereses = Number(linea.pago_sin_intereses ?? 0)
  const minimo = Number(linea.pago_minimo ?? 0)
  const colchon = Math.ceil(minimo * FACTOR_COLCHON)
  const tasaMensual = linea.tasa_interes_anual != null ? Number(linea.tasa_interes_anual) / 12 : null

  // Caso 1: Liquidación total posible
  if (saldoTotal > 0 && saldo >= saldoTotal) {
    return {
      accion: 'Liquídala — cierra esta deuda hoy',
      detalle: `Tienes suficiente para saldar los ${formatMXN(saldoTotal)} completos`,
      color: 'verde',
      monto_sugerido: saldoTotal,
      monto_minimo: minimo,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 2: Pago de corte sin intereses
  if (pagoSinIntereses > 0 && saldo >= pagoSinIntereses) {
    return {
      accion: 'Paga el corte completo — sin intereses',
      detalle: `Pago de ${formatMXN(pagoSinIntereses)} cubre el periodo sin generar intereses`,
      color: 'amarillo',
      monto_sugerido: pagoSinIntereses,
      monto_minimo: minimo,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 3: Entre mínimo+colchón y pago sin intereses
  if (minimo > 0 && saldo >= minimo + colchon) {
    const montoMaximo = pagoSinIntereses > 0
      ? Math.min(saldo, pagoSinIntereses - 1)
      : saldo
    const interesEstimado = calcularInteresEstimado(saldoTotal - minimo, tasaMensual)

    return {
      accion: `Paga entre ${formatMXN(minimo + colchon)} y ${formatMXN(montoMaximo)}`,
      detalle: interesEstimado
        ? `Pagar más reduce intereses. Si pagas el mínimo: ${formatMXN(interesEstimado)}/mes`
        : `Paga lo más que puedas para reducir el saldo`,
      color: 'naranja',
      monto_sugerido: montoMaximo,
      monto_minimo: minimo,
      interes_estimado_mensual: interesEstimado,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 4: Solo alcanza el mínimo
  if (minimo > 0 && saldo >= minimo) {
    const interesEstimado = calcularInteresEstimado(saldoTotal - minimo, tasaMensual)

    return {
      accion: 'Paga el mínimo',
      detalle: interesEstimado
        ? `Interés estimado: ${formatMXN(interesEstimado)}/mes sobre el saldo restante`
        : `Solo cubre el pago mínimo requerido`,
      color: 'rojo',
      monto_sugerido: minimo,
      monto_minimo: minimo,
      interes_estimado_mensual: interesEstimado,
      fecha_ingreso_proximo: null,
      nombre_ingreso_proximo: null,
    }
  }

  // Caso 5: Ingreso próximo llega antes del vencimiento
  const ingreso = ingresoAntesDelVencimiento(linea.fecha_proximo_pago, ingresoProximo)
  if (ingreso) {
    return {
      accion: `Espera al ${formatFecha(ingreso.fecha_esperada)} — llega ${ingreso.nombre}`,
      detalle: `Ingreso de ${formatMXN(ingreso.monto)} llega antes del vencimiento`,
      color: 'morado',
      monto_sugerido: minimo,
      monto_minimo: minimo,
      interes_estimado_mensual: null,
      fecha_ingreso_proximo: ingreso.fecha_esperada,
      nombre_ingreso_proximo: ingreso.nombre,
    }
  }

  // Caso 6: Sin liquidez y sin ingreso próximo
  return {
    accion: 'No pagues hoy — sin liquidez',
    detalle: `Saldo insuficiente para el mínimo (${formatMXN(minimo)}). Evalúa renegociar o buscar fondos.`,
    color: 'rojo_fuerte',
    monto_sugerido: null,
    monto_minimo: minimo,
    interes_estimado_mensual: calcularInteresEstimado(saldoTotal, tasaMensual),
    fecha_ingreso_proximo: null,
    nombre_ingreso_proximo: null,
  }
}

/**
 * Genera una recomendación de pago para una línea de crédito dado el saldo disponible.
 *
 * Usa los campos globales de la línea (pago_sin_intereses, pago_minimo, saldo_al_corte)
 * que representan el estado de cuenta actual.
 *
 * @param reservaOperativa - Monto a reservar para gastos básicos antes de comprometer liquidez.
 */
export function getRecomendacionLinea(
  linea: LineaParaRecomendacion,
  saldoDisponible: number,
  ingresoProximo: IngresoProximo | null = null,
  reservaOperativa = 0
): Recomendacion {
  return recomendarLinea(linea, saldoDisponible - reservaOperativa, ingresoProximo)
}

/**
 * Genera recomendaciones para una lista de líneas de crédito, ordenadas por urgencia.
 *
 * @param ingresos         - Lista de ingresos próximos; para cada línea se busca el primero
 *                           que llega antes de su vencimiento.
 * @param reservaOperativa - Monto a reservar para gastos básicos antes de comprometer liquidez.
 */
export function getRecomendacionesLineas(
  lineas: LineaParaRecomendacion[],
  saldoDisponible: number,
  ingresos: IngresoProximo[],
  reservaOperativa = 0
): Array<{ linea: LineaParaRecomendacion; recomendacion: Recomendacion }> {
  const saldoLibre = saldoDisponible - reservaOperativa
  const resultados = lineas.map((linea) => {
    const ingresoProximo =
      ingresos.find((i) => ingresoAntesDelVencimiento(linea.fecha_proximo_pago, i) !== null) ?? null
    return {
      linea,
      recomendacion: recomendarLinea(linea, saldoLibre, ingresoProximo),
    }
  })

  return resultados.sort(
    (a, b) =>
      getPrioridadColor(b.recomendacion.color) -
      getPrioridadColor(a.recomendacion.color)
  )
}
