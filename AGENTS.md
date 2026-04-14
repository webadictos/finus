<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finus Project Notes

- En `/gastos`, el saldo disponible debe mostrarse como contexto secundario, no como bloque protagonista. Usar una variante compacta y expandible por cuenta, distinta al `SaldoHeader` del dashboard.
- En `/gastos`, el filtro `Rango` no debe autoaplicarse al tocar el chip: primero despliega los campos de fecha y solo filtra al pulsar `Aplicar rango`.
- En `/gastos`, la lista de transacciones agrupada por fecha debe mostrar un acumulado diario sutil alineado a la derecha del encabezado.
- En móvil, `/gastos` debe priorizar las transacciones: menos margen superior/lateral, bloques más compactos y chips de `Periodo` / `Forma de pago` en carriles horizontales con scroll oculto.
- En `/ingresos`, los filtros de periodo deben construirse con fecha local `America/Merida`; `Mes actual` no debe incluir bordes del mes anterior ni excluir el último día local del mes.
- Después de registrar un gasto, mostrar feedback inmediato con toast breve de éxito y saldos actualizados, además de refrescar la vista actual.
- En el dashboard, el card `Compromisos vencidos a hoy` debe incluir el monto total vencido debajo del título.
- Los compromisos legacy `revolvente`, `msi` y `disposicion_efectivo` ya no se crean desde `Nuevo pago fijo`, pero sí deben seguir visibles si ya existen.
- En montos y saldos, mostrar centavos reales; no redondear hacia arriba a enteros.
