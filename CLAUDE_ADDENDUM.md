---

## Decisiones de diseño — Abril 2026

> Esta sección documenta decisiones tomadas en sesión de planeación antes de implementarse.
> Cada punto afecta el schema y/o la lógica de negocio. Consultar SCHEMA.md para los nombres exactos de tablas y campos.

---

### 1. Agrupación de compromisos por tarjeta

**Decisión:**
Una tarjeta (crédito o departamental) puede tener múltiples compromisos de distintos tipos simultáneamente — por ejemplo: saldo revolvente + un MSI de electrodoméstico + otro MSI de ropa. Esto es correcto y esperado.

**Cómo se muestra:**
- La vista `/compromisos` debe agrupar visualmente los compromisos por tarjeta
- Cada grupo de tarjeta muestra el total estimado a pagar a esa tarjeta ese mes (suma de sus compromisos)
- Si la tarjeta ya tiene `pago_sin_intereses` y `pago_minimo` capturados del estado de cuenta real, esos valores tienen precedencia sobre el estimado calculado

**Captura del estado de cuenta:**
- Cuando llega el estado de cuenta mensual, el usuario captura dos valores a nivel tarjeta (no por compromiso):
  - `tarjetas.pago_minimo` → el mínimo real que marca el banco
  - `tarjetas.pago_sin_intereses` → el pago sin intereses real que marca el banco
- Finus muestra la diferencia entre su estimado y el valor real capturado
- Estos valores se usan para la recomendación de pago de ese mes

**Por qué así:**
Los compromisos individuales existen para que Finus pueda proyectar meses futuros y entender la composición de la deuda. Pero la decisión de pago mensual se toma sobre el número real del estado de cuenta, que ya contempla intereses, comisiones, seguros y cualquier cargo adicional que Finus no modela.

---

### 2. Tarjetas departamentales en el formulario de alta

**Decisión:**
El enum `tarjetas.tipo` ya incluye `departamental` en el schema, pero no estaba expuesto en el formulario de alta de tarjetas.

**Implementación:**
- El selector de tipo en el formulario de tarjeta debe incluir ambas opciones: `credito` y `departamental`
- No hay diferencia de lógica entre ambos tipos por ahora — la distinción es informativa y para filtros futuros
- Ejemplos de tarjetas departamentales: Liverpool, Sears, Coppel, Suburbia, Chapur

---

### 3. Proyectos de gasto con proveedores y abonos

**Decisión:**
Se agrega soporte para proyectos de gasto multi-proveedor (XV años, bodas, viajes, remodelaciones) donde:
- El costo total no se define de antemano — emerge de la suma de proveedores contratados
- Cada proveedor tiene su propia fecha límite de liquidación y puede requerir anticipo
- Los abonos son libres hasta la fecha límite (no hay mensualidades fijas)

**Tablas nuevas:** `proyectos` y `proyecto_proveedores` — ver SCHEMA.md para definición completa.

**Lógica de Finus:**
- Dado el flujo proyectado de los próximos meses, Finus sugiere cuándo y cuánto abonar a cada proveedor para llegar liquidado antes de su `fecha_limite_liquidacion`
- Los abonos se registran como `transacciones` con `tipo = 'gasto'` y `proyecto_proveedor_id` poblado
- Los totales (`monto_abonado`, `monto_pendiente`) son calculados via RPC `recalcular_proyecto` — nunca actualizar manualmente
- `techo_gasto` en `proyectos` es opcional; si se define, Finus alerta cuando la suma de proveedores lo supera

**Flujo de estados de un proveedor:**
```
sin_anticipo → anticipo_pagado → abonando → liquidado
```

**Conexión con el simulador ¿Puedo?:**
Un proyecto es conceptualmente el inverso de una meta de ahorro: en lugar de acumular hacia un objetivo, se abona a una deuda futura con fecha límite. El simulador puede usar la misma lógica de proyección.

---

### 4. Importación con IA — texto libre a registros estructurados

**Decisión:**
En el onboarding y en cada sección principal, el usuario puede describir sus finanzas en lenguaje natural o pegar texto de cualquier fuente (estado de cuenta, lista, Excel copiado). Claude interpreta el texto y genera una vista previa de los registros a crear. El usuario revisa, corrige si algo está mal, y confirma. Finus crea todo de golpe.

**Flujo:**
1. Usuario abre "Importar con IA" — disponible en onboarding, `/ingresos`, `/compromisos`
2. Pega o escribe texto libre — puede ser desordenado, parcial, en cualquier formato
3. Claude devuelve JSON estructurado con los registros interpretados
4. Finus muestra vista previa editable — el usuario puede quitar o corregir registros antes de confirmar
5. Al confirmar, se crean todos los registros en una sola operación

**Implementación:**
- El prompt a Claude incluye el schema de la entidad objetivo para que devuelva JSON válido
- La vista previa debe ser editable campo por campo antes de confirmar
- La creación masiva va en una server action transaccional — o todo o nada
- Complementar con plantilla Excel/CSV descargable para usuarios que prefieren ese flujo

**Alternativa paralela:** plantilla Excel/CSV descargable con columnas predefinidas que el usuario llena y sube.

---

### 5. Principios de UX — Acciones importantes

**Principio general:**
Ninguna acción importante es irreversible sin confirmación previa ni sin opción de revertir. Este principio aplica a todos los módulos actuales y futuros.

**Confirmación obligatoria antes de ejecutar:**
- Confirmar un ingreso como recibido
- Marcar un compromiso como pagado
- Eliminar cualquier registro (ingreso, compromiso, tarjeta, cuenta, proveedor, proyecto, gasto)
- Importar registros masivos con IA
- Reset general de datos

El modal de confirmación debe mostrar un resumen específico de lo que va a ocurrir — no solo "¿Estás seguro?". Ejemplos:
- Confirmar ingreso: "¿Confirmar Nómina Pinit por $36,600? Esto sumará al saldo disponible."
- Marcar pago: "¿Marcar Telmex $1,772 como pagado? Esto se descontará del saldo disponible."
- Eliminar: "¿Eliminar Liverpool TC? Esta acción no se puede deshacer."

**Revertir después de ejecutar:**
- Confirmar ingreso → botón "Deshacer" visible inmediatamente después
- Marcar pago → botón "Deshacer" visible inmediatamente después
- El deshacer revierte el estado del registro (no elimina la transacción, solo cambia el estado de vuelta)
- El botón de deshacer desaparece al navegar a otra sección o después de 30 segundos

**Componente reutilizable:**
Crear `ConfirmarAccionModal` que reciba `titulo`, `descripcion` y `onConfirm`. Usarlo en todos los módulos donde aplique — actuales y futuros.

**Reset general:**
- Botón accesible desde configuración o perfil — no en flujo principal
- Requiere confirmación explícita con texto ("Escribe RESET para confirmar")
- Elimina todos los datos del usuario excepto su cuenta y configuración básica

---

### 6. Vista `/cuentas` — gestión de cuentas

**Decisión:**
Página dedicada para gestionar las cuentas del usuario (banco, efectivo, digital, inversión). Accesible desde el sidebar. Misma filosofía que `/tarjetas`.

**Implementación:**
- Listado de todas las cuentas activas con: nombre, tipo, saldo actual, moneda
- Botón nueva cuenta en el header
- Botón editar por cuenta — abre `CuentaForm` con datos prellenados
- El saldo de cada cuenta es informativo — solo se modifica via RPC, nunca con `.update()` directo
- Agregar `/cuentas` al sidebar y bottom nav

**CuentaForm campos:**
- nombre → text, requerido
- tipo → enum `banco | efectivo | digital | inversion`
- moneda → default MXN
- color e icono → opcionales

---

### 7. Acuerdos de pago — préstamos en mora renegociados

**Decisión:**
Cuando un préstamo entra en mora y se negocia un nuevo esquema de pago (quita, plazo extendido, monto final acordado), se modela como una entidad `acuerdo_pago` ligada al compromiso original. El compromiso original queda "suspendido" y el acuerdo toma el control de la recomendación.

**Tabla nueva: `acuerdos_pago`**
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | → usuarios |
| compromiso_id | uuid FK | → compromisos |
| monto_acordado | numeric | monto total negociado a pagar |
| fecha_acuerdo | date | cuándo se firmó/acordó |
| fecha_limite | date | cuándo debe estar liquidado |
| monto_abonado | numeric | CALCULADO — suma de transacciones ligadas |
| monto_pendiente | numeric | CALCULADO — monto_acordado - monto_abonado |
| estado | enum | `activo \| cumplido \| incumplido` |
| notas | text\|null | condiciones especiales, nombre del ejecutivo, etc. |
| activo | boolean | masculino → `.eq('activo', true)` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Lógica de Finus:**
- El compromiso original queda marcado como "en acuerdo" — sus mensualidades originales se ignoran para recomendaciones
- El acuerdo se comporta igual que un proyecto de gasto: abonos libres hasta `fecha_limite`
- Finus alerta si el flujo proyectado no alcanza para liquidar antes de la fecha límite
- Los abonos se registran como transacciones con `compromiso_id` del compromiso original

---

### 8. Editar y eliminar gastos

**Decisión:**
En `/gastos` actualmente no hay botón de editar ni eliminar. Ambas acciones son necesarias.

**Implementación:**
- Botón editar en cada `GastoCard` — abre `RegistrarGastoForm` con datos prellenados
- Botón eliminar en cada `GastoCard` — requiere confirmación (ver Sección 5)
- Al eliminar un gasto con `forma_pago = débito | efectivo` → llamar `incrementar_saldo` para revertir el descuento en la cuenta correspondiente
- Al editar un gasto que cambia monto o cuenta → ajustar saldo en consecuencia (decrementar cuenta anterior, incrementar cuenta nueva)

---

### 9. Editar y eliminar compromisos

**Decisión:**
Los compromisos deben poder editarse y eliminarse. Al eliminar un compromiso recurrente, preguntar el alcance de la eliminación.

**Implementación:**
- Botón editar en cada `CompromisoCard` — abre `CompromisoForm` con datos prellenados
- Botón eliminar en cada `CompromisoCard` — requiere confirmación (ver Sección 5)

**Al eliminar un compromiso recurrente, modal con dos opciones:**
- "Eliminar solo este mes" → marca `activo = false` solo para la instancia actual; el compromiso sigue generando mensualidades futuras
- "Eliminar compromiso completo" → marca `activo = false` en el compromiso entero; desaparece de todos los meses

**Al eliminar un compromiso no recurrente:**
- Confirmación simple sin opciones de alcance

---

### 10. Tipo de compromiso: suscripción

**Decisión:**
Agregar `suscripcion` como nuevo valor del enum `tipo_pago` en compromisos.

**Características:**
- Monto fijo, recurrente indefinida
- Sin intereses, sin mínimos, sin mensualidades restantes
- Generalmente se cobra automáticamente a tarjeta de crédito o débito
- Ejemplos: Netflix, Claude, Spotify, iCloud, Adobe

**Lógica de recomendación en `recommendations.ts`:**
- Siempre: "Pago automático — verifica que tengas saldo suficiente en la tarjeta"
- Urgencia baja si hay saldo suficiente, alta si el saldo proyectado no alcanza

**Migración necesaria en Supabase antes de implementar:**
```sql
ALTER TYPE tipo_pago ADD VALUE 'suscripcion';
```

---

### Impacto en `Lo que falta por construir`

Agregar a **Alta prioridad:**
- **Vista `/cuentas`** — CRUD de cuentas, cuenta de efectivo por default, accesible desde sidebar
- **Transferencias entre cuentas** — botón en `/cuentas` y dashboard, dos RPCs atómicas, con confirmación
- **Cuenta de efectivo en onboarding** — sugerirla por default; sin ella los ingresos/gastos en efectivo no cuadran
- **Vista `/configuracion`** — perfil, preferencias, danger zone con reset
- **Vista `/cuentas`** — CRUD de cuentas, accesible desde sidebar
- **Vista `/proyectos`** — CRUD de proyectos y proveedores, barra de progreso, sugerencia de abono mensual
- **`ConfirmarAccionModal` reutilizable** — componente de confirmación para todos los módulos actuales y futuros
- **Revertir acciones** — botón "Deshacer" post-acción visible 30 segundos
- **Editar y eliminar gastos** — con reversión de saldo al eliminar
- **Editar y eliminar compromisos** — con modal de alcance para recurrentes
- **Fix `incrementar_saldo` en `confirmarIngreso`** — garantizar que siempre se ejecute al confirmar un ingreso con cuenta_destino_id

Agregar a **Media prioridad:**
- **Acuerdos de pago** — tabla `acuerdos_pago` + UI para préstamos en mora renegociados. Requiere migración SQL
- **Tipo suscripción en compromisos** — migración SQL + form + lógica de recomendación
- **Captura de estado de cuenta por tarjeta** — flujo mensual para `pago_minimo` y `pago_sin_intereses` reales
- **Importar con IA** — texto libre → Claude → vista previa editable → creación masiva
- **Plantilla Excel/CSV** — descargable como alternativa a importación con IA
- **Reset general** — desde configuración, con confirmación explícita por texto

---

### 11. Transferencias entre cuentas propias

**Decisión:**
Cuando el usuario mueve dinero entre sus propias cuentas (efectivo → banco, banco → efectivo, banco → banco) se registra como una transferencia. Una transferencia genera dos movimientos atómicos en una sola operación.

**Casos de uso:**
- Recibir pago en efectivo y depositar parte al banco → Efectivo a BBVA
- Retiro de cajero → BBVA a Efectivo
- Mover dinero entre dos cuentas bancarias propias

**Modelo:**
- Se registra como una `transacción` con `tipo = 'transferencia'`
- Genera dos RPCs en la misma server action:
  - `decrementar_saldo` en cuenta origen
  - `incrementar_saldo` en cuenta destino
- Si cualquiera de los dos falla, ninguno se ejecuta (operación atómica)

**Ejemplo del escenario real:**
1. Confirmar ingreso Wokii $2,500 → cuenta destino: Efectivo → saldo Efectivo: $2,500
2. Registrar transferencia $2,000 → origen: Efectivo → destino: BBVA
3. Resultado: Efectivo $500, BBVA +$2,000

**UI:**
- Botón "Transferir entre cuentas" en `/cuentas` y como acción rápida en el dashboard
- Form con: cuenta origen, cuenta destino, monto, fecha, notas opcionales
- No se puede transferir a la misma cuenta
- Requiere confirmación antes de ejecutar (ver Sección 5)

---

### 12. Cuenta de efectivo — default en onboarding

**Decisión:**
El efectivo es una cuenta más en Finus (`cuentas.tipo = 'efectivo'`). Sin ella, los ingresos en efectivo no tienen destino válido y los gastos en efectivo no decrementan ningún saldo real.

**Implementación:**
- El onboarding debe sugerir crear una cuenta de tipo efectivo por default con nombre "Efectivo" o "Cartera"
- Si el usuario no tiene ninguna cuenta de tipo efectivo, mostrar aviso en `/cuentas` sugiriendo crearla
- Al confirmar un ingreso, la cuenta de tipo efectivo debe aparecer como opción clara junto a las cuentas bancarias
- Al registrar un gasto en efectivo, debe decrementar la cuenta de tipo efectivo del usuario

---

### 13. Perfil y configuración

**Decisión:**
Página `/configuracion` accesible desde el sidebar (icono de engrane o avatar del usuario).

**Secciones:**
- **Perfil** — nombre, email, avatar
- **Cuentas** — acceso directo a `/cuentas`
- **Preferencias** — moneda default, zona horaria
- **Danger zone** — botón Reset general (ver Sección 5), cerrar sesión

**Notas:**
- El reset general vive aquí, no en el flujo principal
- Cerrar sesión también vive aquí — quitar `LogoutButton` del sidebar si está ahí actualmente


---

### 14. Lectura automática de PDFs de estados de cuenta (Post-MVP)

**Decisión:**
Feature de baja prioridad para una versión futura. El usuario sube el PDF de su estado de cuenta bancario y Finus extrae automáticamente la información relevante para dar de alta o actualizar tarjetas y compromisos.

**Flujo:**
1. Usuario sube PDF del estado de cuenta desde `/tarjetas` o `/compromisos`
2. Finus extrae: saldo al corte, pago mínimo, pago sin intereses, fecha límite, fecha de corte, y cargos individuales
3. Claude identifica qué cargos son MSI, cuáles son recurrentes, cuáles son únicos
4. Vista previa editable — el usuario revisa y corrige antes de confirmar
5. Al confirmar: actualiza la tarjeta y crea los compromisos detectados de golpe

**Conexión con Sección 4:**
Es la misma filosofía que la importación con IA en texto libre, pero con PDF como fuente. Puede compartir la misma vista previa editable y la misma server action de creación masiva.

**Consideraciones técnicas:**
- Usar Claude API con soporte de documentos PDF (ya soportado en el SDK)
- El prompt incluye el schema de `tarjetas` y `compromisos` para que devuelva JSON válido
- Cada banco tiene formato distinto — Claude maneja la variabilidad sin reglas hardcodeadas
- Agregar a `/api/aconsejame` o crear endpoint dedicado `/api/leer-estado-cuenta`


Agregar a **Baja prioridad:**
- **Lectura automática de PDFs de estados de cuenta** — subir PDF → Claude extrae → vista previa editable → alta masiva de tarjeta y compromisos

---

### 15. Sincronizar saldo de cuenta manualmente

**Decisión:**
Cuando hay discrepancias entre el saldo en Finus y el saldo real del banco (por saldo inicial incorrecto, movimientos no capturados, etc.), el usuario puede sincronizar el saldo manualmente.

**Implementación:**
- Botón "Sincronizar saldo" en cada CuentaCard en `/cuentas`
- Abre modal con input para capturar el saldo real actual
- Muestra el delta antes de confirmar: "Esto ajustará el saldo de $X a $Y (diferencia de +$Z / -$Z)"
- Requiere confirmación (ver Sección 5)
- Implementar via nueva RPC `ajustar_saldo(p_cuenta_id, p_saldo_nuevo)` que hace UPDATE directo a saldo_actual — es el único caso donde se permite modificar saldo_actual sin incrementar/decrementar
- Registrar una transacción de tipo 'ajuste' con la diferencia para mantener trazabilidad

---

### 16. Fecha de último pago opcional en todos los tipos de compromiso

**Decisión:**
El campo `fecha_fin_estimada` debe estar disponible para todos los tipos de compromiso, no solo préstamos y MSI. Cualquier compromiso puede ser temporal.

**Casos de uso:**
- Suscripción de 3 meses → fecha límite en julio
- Servicio contratado por tiempo definido
- Préstamo a familiar con fecha acordada

**Implementación:**
- En CompromisoForm mostrar `fecha_fin_estimada` como campo opcional para todos los tipos
- Label: "Fecha de último pago (opcional)"
- Si se llena, Finus deja de proyectar ese compromiso después de esa fecha
- Para préstamo y MSI: mantener además el cálculo automático desde `mensualidades_restantes`

---

### 17. Servicios variables y gastos recurrentes estimados — Gastos Previstos

**Decisión:**
Los servicios variables (agua, luz bimestral) y gastos recurrentes estimados (limpieza semanal, croquetas) se modelan en `gastos_previstos` — ya existe la tabla. Finus los suma a la proyección aunque no estén registrados como gastos ese día.

**Casos de uso:**
- Agua/luz → bimestral, monto estimado, certeza media. Al llegar el recibo se confirma con monto real
- Señora de limpieza → $600 semanal, certeza alta
- Croquetas perros → mensual, monto fijo, certeza alta

**Mejoras necesarias en la UI de Gastos Previstos:**
- Frecuencia bimestral (cada 60 días) — agregar como opción
- Al confirmar un gasto previsto, preguntar el monto real si es variable
- Mostrar gastos previstos próximos en el dashboard como recordatorio

---

### 18. Categoría "Casa" en gastos

**Decisión:**
Agregar categoría `casa` al listado de categorías disponibles en `RegistrarGastoForm`.

**Cubre:**
- Gastos de limpieza del hogar
- Artículos para el hogar
- Mantenimiento
- Otros gastos domésticos que no encajan en categorías existentes

