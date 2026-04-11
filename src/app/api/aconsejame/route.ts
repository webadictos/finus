import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getRecomendacion } from '@/lib/recommendations'
import type { CompromisoParaRecomendacion, IngresoProximo } from '@/types/finus'

const PROB_FACTOR: Record<string, number> = { alta: 0.9, media: 0.5, baja: 0.2 }

function formatMXN(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(n)
}

export async function POST(): Promise<Response> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  const hoy = new Date()
  const en30Dias = new Date(hoy)
  en30Dias.setDate(hoy.getDate() + 30)
  const fechaLimite = en30Dias.toISOString().split('T')[0]
  const fechaHoy = hoy.toISOString().split('T')[0]

  const [cuentasRes, ingresosRes, compromisosRes, gastosRes, txRes] = await Promise.all([
    supabase
      .from('cuentas')
      .select('saldo_actual, tipo, nombre')
      .eq('usuario_id', user.id)
      .eq('activa', true)
      .neq('tipo', 'inversion'),

    supabase
      .from('ingresos')
      .select('nombre, monto_esperado, probabilidad, fecha_esperada')
      .eq('usuario_id', user.id)
      .eq('estado', 'esperado')
      .gte('fecha_esperada', fechaHoy)
      .lte('fecha_esperada', fechaLimite)
      .order('fecha_esperada', { ascending: true }),
    supabase
      .from('compromisos')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .lte('fecha_proximo_pago', fechaLimite)
      .order('fecha_proximo_pago', { ascending: true }),
    supabase
      .from('gastos_previstos')
      .select('nombre, monto_estimado, certeza, fecha_confirmada, fecha_sugerida, mes')
      .eq('usuario_id', user.id)
      .eq('activo', true),
    supabase
      .from('transacciones')
      .select('tipo, monto, fecha, descripcion, categoria')
      .eq('usuario_id', user.id)
      .order('fecha', { ascending: false })
      .limit(10),
  ])

  // ── Calcular saldo ────────────────────────────────────────────────────────
  const saldoActual = (cuentasRes.data ?? []).reduce(
    (sum, c) => sum + Number(c.saldo_actual ?? 0),
    0
  )

  // ── Ingreso más próximo (para recomendaciones revolventes) ────────────────
  const ingresos = ingresosRes.data ?? []
  const ingresoProximo: IngresoProximo | null =
    ingresos.length > 0 && ingresos[0].fecha_esperada
      ? {
          nombre: ingresos[0].nombre,
          monto: Number(ingresos[0].monto_esperado ?? 0) * (PROB_FACTOR[ingresos[0].probabilidad] ?? 0.5),
          fecha_esperada: ingresos[0].fecha_esperada,
        }
      : null

  // ── Construir contexto de compromisos con recomendación ──────────────────
  const compromisos = compromisosRes.data ?? []
  const compromisosConRec = compromisos.map((c) => {
    const para: CompromisoParaRecomendacion = {
      tipo_pago: c.tipo_pago,
      saldo_real: c.saldo_real,
      monto_mensualidad: c.monto_mensualidad,
      pago_minimo: c.pago_minimo,
      pago_sin_intereses: c.pago_sin_intereses,
      mensualidades_restantes: c.mensualidades_restantes,
      tasa_interes_anual: c.tasa_interes_anual,
      fecha_proximo_pago: c.fecha_proximo_pago,
      nombre: c.nombre,
    }
    const rec = getRecomendacion(para, saldoActual, ingresoProximo)
    return { ...c, recomendacion: rec }
  })

  // ── Construir el prompt ───────────────────────────────────────────────────
  const ingresosLineas = ingresos.map((i) => {
    const monto = Number(i.monto_esperado ?? 0)
    const factor = PROB_FACTOR[i.probabilidad] ?? 0.5
    const fecha = i.fecha_esperada
    return `  - ${i.nombre}: ${formatMXN(monto * factor)} (prob. ${i.probabilidad}, ${fecha})`
  })

  const compromisosLineas = compromisosConRec.map((c) => {
    const monto = Number(c.monto_mensualidad ?? 0)
    const rec = c.recomendacion
    return `  - ${c.nombre} [${c.tipo_pago}]: ${formatMXN(monto)} vence ${c.fecha_proximo_pago ?? 'N/A'} → ${rec.accion}`
  })

  const gastosLineas = (gastosRes.data ?? []).map((g) => {
    const fecha = g.fecha_confirmada ?? g.fecha_sugerida ?? g.mes ?? 'sin fecha'
    return `  - ${g.nombre}: ${formatMXN(Number(g.monto_estimado ?? 0))} (certeza ${g.certeza}, ${fecha})`
  })

  const txLineas = (txRes.data ?? []).map((t) => {
    const signo = t.tipo === 'ingreso' ? '+' : '-'
    return `  - ${t.fecha} ${signo}${formatMXN(Number(t.monto ?? 0))} ${t.descripcion ?? t.categoria ?? t.tipo}`
  })

  const prompt = `Eres el asesor financiero de Finus. Analiza esta situación y da recomendaciones concretas ordenadas por prioridad. Sé directo, específico y prescriptivo — no describas la situación, di exactamente qué hacer.

SITUACIÓN FINANCIERA:
Saldo disponible hoy: ${formatMXN(saldoActual)}

INGRESOS ESPERADOS (próximos 30 días):
${ingresosLineas.length > 0 ? ingresosLineas.join('\n') : '  Sin ingresos registrados'}

COMPROMISOS PENDIENTES (próximos 30 días):
${compromisosLineas.length > 0 ? compromisosLineas.join('\n') : '  Sin compromisos próximos'}

GASTOS PREVISTOS:
${gastosLineas.length > 0 ? gastosLineas.join('\n') : '  Sin gastos previstos'}

ÚLTIMAS TRANSACCIONES:
${txLineas.length > 0 ? txLineas.join('\n') : '  Sin transacciones recientes'}

Responde con máximo 5 recomendaciones concretas numeradas. Cada una debe tener: acción específica, monto exacto si aplica, y por qué es prioritaria.`

  // ── Llamar Claude con streaming ──────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY no configurada en el servidor' },
      { status: 500 }
    )
  }

  const client = new Anthropic({ apiKey })

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
