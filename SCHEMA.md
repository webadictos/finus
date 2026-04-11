# Finus — Schema completo de Supabase
> Fuente de verdad absoluta del DB. Actualizar este archivo cada vez que cambie el schema.
> Claude Code debe consultar este archivo antes de escribir cualquier query, RPC o tipo.

---

## ⚠️ Reglas críticas de nomenclatura

- `cuentas.activa` → femenino → `.eq('activa', true)`
- `tarjetas.activa` → femenino → `.eq('activa', true)`
- `compromisos.activo` → masculino → `.eq('activo', true)`
- `gastos_previstos.activo` → masculino → `.eq('activo', true)`
- `proyectos.activo` → masculino → `.eq('activo', true)`
- `proyecto_proveedores.activo` → masculino → `.eq('activo', true)`
- Supabase devuelve campos `numeric` como strings → siempre `Number(valor ?? 0)` antes de aritmética
- Nunca modificar `cuentas.saldo_actual` con `.update()` directo → usar RPCs `incrementar_saldo` / `decrementar_saldo`
- `compromisos.fecha_proximo_pago` → NO `fecha_vencimiento`
- `compromisos.monto_mensualidad` → NO `msi_mensualidad`
- `compromisos.mensualidades_restantes` → NO `msi_mensualidades`
- `compromisos.tasa_interes_anual` → NO `tasa_interes_mensual` (dividir /12 para cálculos mensuales)
- `ingresos.monto_esperado` → NO `monto`
- `transacciones` → NO tiene columna `ingreso_id`

---

## Tablas

### `usuarios`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | FK → auth.users |
| email | text | |
| nombre | text\|null | |
| avatar_url | text\|null | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `cuentas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| nombre | text | ej: "BBVA débito Daniel", "Efectivo" |
| tipo | enum | `banco \| efectivo \| digital \| inversion` |
| saldo_actual | numeric(12,2) | ⚠️ Solo modificar via RPC; default 0 |
| tiene_tarjeta_debito | boolean | default false |
| ultimos_4_debito | char(4)\|null | últimos 4 dígitos de la tarjeta débito |
| color | text\|null | default '#6366F1' |
| icono | text\|null | default '🏦' |
| moneda | text | default 'MXN' — no se edita en UI |
| **activa** | boolean | ⚠️ femenino → `.eq('activa', true)`; default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `tarjetas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| nombre | text | ej: "Santander Tania", "Liverpool Daniel" |
| tipo | enum | `credito \| departamental` |
| titular_tipo | enum | `personal \| pareja \| familiar \| empresa \| tercero` |
| titular_nombre | text\|null | texto libre |
| ultimos_4 | text\|null | últimos 4 dígitos |
| limite_credito | numeric | |
| saldo_actual | numeric | saldo utilizado acumulado |
| saldo_al_corte | numeric\|null | monto del estado de cuenta al corte |
| pago_sin_intereses | numeric\|null | ⚠️ capturado del estado de cuenta real, NO calculado |
| pago_minimo | numeric\|null | ⚠️ capturado del estado de cuenta real, NO calculado |
| dia_corte | int\|null | día del mes (ej: 5) |
| dia_limite_pago | int\|null | día del mes (ej: 20) |
| tasa_interes_mensual | numeric\|null | en tarjetas es mensual (a diferencia de compromisos) |
| **activa** | boolean | ⚠️ femenino → `.eq('activa', true)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Notas de negocio:**
- `pago_sin_intereses` y `pago_minimo` se capturan manualmente cuando llega el estado de cuenta real
- Son el valor que Finus usa para la recomendación de pago ese mes, preferido sobre el estimado calculado
- Una misma tarjeta puede tener múltiples compromisos de distintos tipos (revolvente + MSI + fijo)
- El pago total real a la tarjeta = `pago_sin_intereses` o `pago_minimo` del estado de cuenta, no la suma de compromisos individuales

---

### `ingresos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| nombre | text | ej: "Nómina Pinit", "Proyecto Wokii" |
| tipo | enum | `fijo_recurrente \| proyecto_recurrente \| unico` |
| es_recurrente | boolean | |
| frecuencia | enum\|null | `mensual \| quincenal \| semanal \| anual` |
| dia_del_mes | int\|null | para "cada día 30 del mes" |
| fecha_inicio | date\|null | |
| fecha_fin | date\|null | |
| indefinido | boolean | |
| monto_fijo | numeric\|null | monto fijo para recurrentes |
| **monto_esperado** | numeric\|null | ⚠️ NO `monto` |
| monto_minimo | numeric\|null | |
| monto_maximo | numeric\|null | |
| **fecha_esperada** | date\|null | fecha de cobro estimada |
| fecha_real | date\|null | fecha real al confirmar |
| monto_real | numeric\|null | monto real al confirmar |
| estado | enum | `confirmado \| pendiente \| en_riesgo \| esperado` |
| probabilidad | enum | `alta \| media \| baja` |
| cuenta_destino_id | uuid\|null | FK → cuentas; saldo se suma al confirmar |
| forma_recepcion | text\|null | |
| concepto_fiscal | text\|null | |
| requiere_factura | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `compromisos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| tarjeta_id | uuid\|null | FK → tarjetas |
| nombre | text | |
| categoria | text\|null | |
| tipo_pago | enum | `fijo \| revolvente \| msi \| prestamo \| disposicion_efectivo` |
| **monto_mensualidad** | numeric\|null | ⚠️ NO `msi_mensualidad` |
| **fecha_proximo_pago** | date\|null | ⚠️ NO `fecha_vencimiento` |
| **mensualidades_restantes** | int\|null | ⚠️ NO `msi_mensualidades` |
| fecha_inicio | date\|null | |
| monto_original | numeric\|null | |
| meses_totales | int\|null | |
| saldo_estimado | numeric\|null | calculado: mensualidad × mensualidades_restantes |
| fecha_fin_estimada | date\|null | calculada |
| saldo_real | numeric\|null | saldo real de la tarjeta (solo revolvente) |
| pago_sin_intereses | numeric\|null | solo revolvente — estimado por Finus |
| pago_minimo | numeric\|null | solo revolvente — estimado por Finus |
| fecha_corte | int\|null | día del mes |
| **tasa_interes_anual** | numeric\|null | ⚠️ NO `tasa_interes_mensual`; dividir /12 para cálculos mensuales |
| prioridad | enum\|null | `alta \| media \| baja` |
| **activo** | boolean | ⚠️ masculino → `.eq('activo', true)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Notas de negocio:**
- Un compromiso representa un cargo específico dentro de una tarjeta (un MSI, el saldo revolvente, etc.)
- Una tarjeta puede tener múltiples compromisos de distintos tipos simultáneamente
- La recomendación de pago de un compromiso individual es un estimado de Finus
- El pago real a la tarjeta se captura en `tarjetas.pago_sin_intereses` y `tarjetas.pago_minimo` del estado de cuenta

---

### `gastos_previstos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| nombre | text | |
| monto_estimado | numeric | |
| tipo_programacion | enum | `recurrente_aprox \| previsto_sin_fecha \| eventual` |
| frecuencia_dias | int\|null | para `recurrente_aprox` |
| ultima_ocurrencia | date\|null | |
| mes | text\|null | formato `YYYY-MM` para `previsto_sin_fecha` |
| ventana_dias | int\|null | |
| certeza | enum | `alta \| media \| baja` |
| fecha_sugerida | date\|null | calculada automáticamente |
| fecha_confirmada | date\|null | confirmada por el usuario |
| realizado | boolean | |
| monto_real | numeric\|null | |
| notas | text\|null | |
| **activo** | boolean | ⚠️ masculino → `.eq('activo', true)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `transacciones`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| tipo | enum | `ingreso \| gasto \| transferencia` |
| monto | numeric | |
| fecha | date | |
| descripcion | text\|null | |
| categoria | text\|null | |
| cuenta_id | uuid\|null | FK → cuentas |
| tarjeta_id | uuid\|null | FK → tarjetas |
| compromiso_id | uuid\|null | FK → compromisos |
| proyecto_proveedor_id | uuid\|null | FK → proyecto_proveedores (si es abono a proveedor) |
| forma_pago | text\|null | |
| meses_msi | int\|null | |
| es_recurrente | boolean | |
| notas | text\|null | |
| created_at | timestamptz | |
| ❌ NO existe `ingreso_id` | — | transacciones no referencian ingresos directamente |

---

### `metas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| nombre | text | ej: "Refrigerador", "Vacaciones" |
| monto_objetivo | numeric | |
| monto_actual | numeric | |
| fecha_objetivo | date\|null | |
| activa | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `proyectos` ✨ NUEVA
Agrupa un conjunto de proveedores hacia un evento o meta de gasto.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| nombre | text | ej: "XV Años Regina", "Boda", "Remodelación cocina" |
| descripcion | text\|null | |
| fecha_evento | date\|null | fecha del evento o deadline final |
| total_comprometido | numeric | ⚠️ CALCULADO — suma de `proyecto_proveedores.monto_total` |
| total_abonado | numeric | ⚠️ CALCULADO — suma de abonos registrados en transacciones |
| total_pendiente | numeric | ⚠️ CALCULADO — `total_comprometido - total_abonado` |
| techo_gasto | numeric\|null | opcional — límite autoimpuesto; Finus alerta si se supera al agregar proveedores |
| estado | enum | `planeando \| en_curso \| completado \| cancelado` |
| **activo** | boolean | ⚠️ masculino → `.eq('activo', true)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Notas de negocio:**
- `total_comprometido`, `total_abonado` y `total_pendiente` son campos calculados — actualizarlos via trigger o RPC al insertar/modificar proveedores y abonos
- `techo_gasto` es opcional; el usuario puede no definirlo (caso XV años: el total emerge de los proveedores contratados)
- Un proyecto puede estar activo meses antes del evento

---

### `proyecto_proveedores` ✨ NUEVA
Cada proveedor contratado dentro de un proyecto.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| proyecto_id | uuid FK | → proyectos |
| usuario_id | uuid FK | → usuarios |
| nombre | text | ej: "Salón Jardines del Pedregal", "Fotografía Estudio Luz" |
| categoria | text\|null | ej: "local", "fotografía", "vestido", "maquillaje", "música" |
| monto_total | numeric | monto total acordado con el proveedor |
| anticipo_requerido | numeric\|null | monto del anticipo (si aplica) |
| fecha_anticipo | date\|null | fecha límite para pagar el anticipo |
| fecha_limite_liquidacion | date | fecha límite para quedar liquidado con este proveedor |
| monto_abonado | numeric | ⚠️ CALCULADO — suma de abonos de `transacciones` con este `proyecto_proveedor_id` |
| monto_pendiente | numeric | ⚠️ CALCULADO — `monto_total - monto_abonado` |
| estado | enum | `sin_anticipo \| anticipo_pagado \| abonando \| liquidado \| cancelado` |
| notas | text\|null | condiciones especiales, datos de contacto, etc. |
| **activo** | boolean | ⚠️ masculino → `.eq('activo', true)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Notas de negocio:**
- `monto_abonado` y `monto_pendiente` son calculados — actualizarlos via RPC al registrar abonos
- Los abonos se registran como `transacciones` con `tipo = 'gasto'` y `proyecto_proveedor_id` poblado
- Finus puede calcular cuánto abonar por mes a cada proveedor dado el flujo proyectado y la `fecha_limite_liquidacion`
- Un proveedor sin `anticipo_requerido` permite abonos libres hasta la fecha límite

---

## RPCs de Supabase

```sql
-- Modificar saldo de cuentas (security definer, actualizan updated_at)
public.incrementar_saldo(p_cuenta_id uuid, p_monto numeric) → void
public.decrementar_saldo(p_cuenta_id uuid, p_monto numeric) → void

-- Actualizar totales calculados de proyectos (llamar al insertar/modificar abonos)
public.recalcular_proyecto(p_proyecto_id uuid) → void
-- Recalcula: total_comprometido, total_abonado, total_pendiente en proyectos
-- Recalcula: monto_abonado, monto_pendiente en proyecto_proveedores
```

**Cuándo se llaman:**
- `decrementar_saldo` → `registrarGasto` (efectivo/débito) y `marcarPagado` (si se selecciona cuenta)
- `incrementar_saldo` → `confirmarIngreso` (si tiene `cuenta_destino_id`)
- `recalcular_proyecto` → al registrar o eliminar cualquier abono a un proveedor de proyecto

---

## Relaciones entre tablas

```
usuarios
  ├── cuentas (1:N)
  ├── tarjetas (1:N)
  │     └── compromisos (1:N) — una tarjeta puede tener varios compromisos de distintos tipos
  ├── ingresos (1:N)
  ├── compromisos (1:N) — también pueden existir sin tarjeta
  ├── gastos_previstos (1:N)
  ├── transacciones (1:N)
  │     ├── → cuentas (cuenta_id)
  │     ├── → tarjetas (tarjeta_id)
  │     ├── → compromisos (compromiso_id)
  │     └── → proyecto_proveedores (proyecto_proveedor_id)
  ├── metas (1:N)
  └── proyectos (1:N)
        └── proyecto_proveedores (1:N)
```
