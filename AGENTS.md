<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finus Project Notes

- En `/gastos`, el saldo disponible debe mostrarse como contexto secundario, no como bloque protagonista. Usar una variante compacta y expandible por cuenta, distinta al `SaldoHeader` del dashboard.
- Después de registrar un gasto, mostrar feedback inmediato con toast breve de éxito y saldos actualizados, además de refrescar la vista actual.
- En el dashboard, el card `Compromisos vencidos a hoy` debe incluir el monto total vencido debajo del título.
- Los compromisos legacy `revolvente`, `msi` y `disposicion_efectivo` ya no se crean desde `Nuevo pago fijo`, pero sí deben seguir visibles si ya existen.
- En montos y saldos, mostrar centavos reales; no redondear hacia arriba a enteros.
