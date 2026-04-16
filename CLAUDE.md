@AGENTS.md

# Finus — Memoria permanente del proyecto

## ¿Qué es Finus?

Finus es un dashboard de planificación financiera personal. Su filosofía central:

> **No te dice en qué gastaste. Te dice qué hacer con tu dinero.**

No es un tracker de gastos retroactivo. Es una herramienta prescriptiva: dado tu saldo actual, tus ingresos esperados y tus compromisos próximos, te dice exactamente qué pagar, cuándo, y cuánto. El endpoint `/api/aconsejame` materializa esto llamando a Claude con contexto financiero real del usuario.

El usuario objetivo tiene múltiples tarjetas de crédito, ingresos variables (freelance + nómina), y necesita saber si puede pagar el mínimo o el total de cada tarjeta esta quincena.

---

## Stack y versiones exactas

```
next                16.2.3       — App Router, Server Components, Server Actions
react               19.2.4
typescript          ^5
tailwindcss         ^4           — sin config file, funciona con @import en globals.css
tw-animate-css      ^1.4.0       — clases data-[state=open]:animate-in etc.
@supabase/ssr       ^0.10.2      — cliente SSR con cookies
@supabase/supabase-js ^2.103.0
@anthropic-ai/sdk   ^0.88.0      — streaming con messages.stream()
@simplewebauthn/browser / server — passkeys propias de Finus (registro, unlock y login)
radix-ui            ^1.4.3       — paquete unificado (NO @radix-ui/react-* separados)
@base-ui/react      ^1.3.0       — solo para Button
class-variance-authority ^0.7.1
lucide-react        ^1.8.0
clsx + tailwind-merge ^2/^3
```

**No hay:**

- Redux / Zustand / Context API para estado global (innecesario con Server Components)
- React Query / SWR (datos se cargan en Server Components directamente)
- Prisma / Drizzle (se usa Supabase JS client directamente)
- shadcn/ui instalado como componentes (solo Button de @base-ui, Dialog de radix-ui)

---

## Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx                    — RootLayout: fuentes Geist, html lang="es"
│   ├── globals.css                   — Variables CSS, @import tailwindcss
│   ├── (auth)/
│   │   ├── layout.tsx                — Layout mínimo sin sidebar
│   │   ├── login/page.tsx            — Login con email/password + botón de passkey
│   │   ├── register/page.tsx         — Registro
│   │   └── actions.ts                — signIn, signUp, signOut server actions
│   ├── (dashboard)/
│   │   ├── layout.tsx                — Sidebar desktop + DashboardShell mobile + auth check
│   │   ├── page.tsx                  — Dashboard: saldo + KPIs + reserva operativa + alertas
│   │   ├── actions.ts                — (acciones globales del dashboard si las hay)
│   │   ├── compromisos/
│   │   │   ├── page.tsx              — Server Component: fetch compromisos + cuentas + tarjetas
│   │   │   └── actions.ts            — crearCompromiso, actualizarCompromiso, marcarPagado
│   │   ├── gastos/
│   │   │   ├── page.tsx              — Server Component: fetch transacciones por periodo/pago vía searchParams
│   │   │   └── actions.ts            — registrarGasto → insert transacción + decrementar_saldo
│   │   ├── ingresos/
│   │   │   ├── page.tsx              — Server Component: fetch ingresos + cuentas + proyección recurrente
│   │   │   └── actions.ts            — crearIngreso, actualizarIngreso, confirmarIngreso, phantom confirm
│   │   ├── presupuesto/
│   │   │   ├── page.tsx              — Vista de presupuesto operativo
│   │   │   └── actions.ts            — CRUD + sugerencias para partidas operativas
│   │   ├── proyeccion/
│   │   │   ├── page.tsx              — Server Component: fetch saldo + ingresos + compromisos + gastos
│   │   │   └── actions.ts            — crearGastoPrevisto, actualizarGastoPrevisto, confirmarFechaGasto
│   │   └── metas/
│   │       └── page.tsx              — PLACEHOLDER — sin implementar
│   └── api/
│       ├── aconsejame/
│       │   └── route.ts              — POST: fetch datos usuario → prompt → stream Claude Haiku
│       ├── webauthn/
│       │   ├── credentials/route.ts  — Lista/elimina passkeys autenticadas del usuario
│       │   ├── register/*            — Opciones y verificación de registro WebAuthn
│       │   ├── authenticate/*        — Unlock/reautenticación dentro de sesión
│       │   └── login/*               — Login completo con passkey + emisión de sesión Supabase
│       └── supabase/
│           ├── compromisos/route.ts  — PLACEHOLDER (TODO)
│           └── ingresos/route.ts     — PLACEHOLDER (TODO)
│
├── components/
│   ├── ui/                           — Componentes base reutilizables
│   │   ├── button.tsx                — Wrapper de @base-ui/react Button con CVA variants
│   │   ├── input.tsx                 — Input HTML estilizado
│   │   ├── label.tsx                 — Label HTML estilizado
│   │   └── card.tsx                  — Card simple (raramente usada directamente)
│   ├── shared/                       — Componentes de dominio reutilizables
│   │   ├── Badge.tsx                 — Pill de estado. Variants: default|success|warning|error|info|purple|orange
│   │   └── ProgressBar.tsx           — Barra verde (value≥max) o roja
│   ├── dashboard/
│   │   ├── SaldoHeader.tsx           — Suma de cuentas líquidas + lista de cuentas
│   │   ├── KPICards.tsx              — KPIs incluyendo reserva operativa
│   │   ├── AlertasVencimiento.tsx    — Compromisos que vencen en 7 días con recomendación
│   │   ├── ProximosIngresos.tsx      — Ingresos esperados próximos
│   │   ├── AconsejameButton.tsx      — Botón + panel inline que consume el stream de /api/aconsejame
│   │   ├── ConfirmarIngresoButton.tsx— Se usa para confirmar ingresos proyectados/fantasma
│   │   ├── DashboardShell.tsx        — Header sticky mobile + pull-to-refresh solo en `/` + lock screen
│   │   └── LogoutButton.tsx          — Client Component que llama signOut
│   ├── compromisos/
│   │   ├── CompromisoCard.tsx        — Card con recomendación calculada, botón "Marcar pagado"
│   │   ├── CompromisoForm.tsx        — Sheet deslizable para crear/editar compromiso
│   │   ├── NuevoCompromisoButton.tsx — Client Component que abre CompromisoForm
│   │   ├── PagarModal.tsx            — Modal centrado con opciones rápidas + selector de cuenta
│   │   └── RecomendacionBadge.tsx    — Muestra el resultado de getRecomendacion() con color
│   ├── gastos/
│   │   ├── GastoCard.tsx             — Card responsiva con chips de metadata; swipe edit/delete en móvil
│   │   ├── GastosClient.tsx          — Client Component: filtros por periodo/pago, KPIs, agrupación por fecha, abre form
│   │   └── RegistrarGastoForm.tsx    — Sheet para registrar gasto rápido + subcategoria/momento_del_dia
│   ├── ingresos/
│   │   ├── IngresoCard.tsx           — Card con estado, badges, botón "Confirmar recibido"
│   │   ├── IngresoForm.tsx           — Sheet para crear/editar ingreso + cuenta_destino
│   │   ├── NuevoIngresoButton.tsx    — Client Component que abre IngresoForm
│   │   └── ConfirmarModal.tsx        — Modal para confirmar monto real + fecha
│   ├── presupuesto/
│   │   ├── PartidaCard.tsx           — Card de partida operativa
│   │   ├── PartidaForm.tsx           — Form/modal accesible para crear/editar partidas
│   │   └── PresupuestoClient.tsx     — KPIs, listado y flujo de sugerencias
│   ├── configuracion/
│   │   ├── ConfiguracionClient.tsx   — Perfil, seguridad, passkeys y reset
│   │   └── PasskeysSection.tsx       — Registro/listado/eliminación de passkeys propias
│   ├── auth/
│   │   └── PasskeyLoginButton.tsx    — Botón de login completo con passkey en `/login`
│   ├── security/
│   │   └── IdleLockOverlay.tsx       — Bloqueo tras inactividad + unlock por passkey/contraseña
│   └── proyeccion/
│       ├── ProyeccionClient.tsx      — Client Component: tabs Resumen/Gastos previstos, selector horizonte (7/15/30/45d), saldo proyectado
│       ├── GastoPrevistoCard.tsx     — Card con certeza, fecha, botón confirmar fecha
│       ├── GastoPrevistoForm.tsx     — Sheet para crear/editar gasto previsto
│       └── ConfirmarFechaModal.tsx   — Modal para confirmar fecha de un gasto previsto
│
├── lib/
│   ├── format.ts                     — formatMXN(), formatFecha(), diasHastaFecha()
│   ├── local-date.ts                 — Helpers de fecha local (`YYYY-MM-DD`) sin corrimiento por UTC
│   ├── gastos-filters.ts             — Periodos y filtros de forma de pago para `/gastos`
│   ├── ingreso-phantom.ts            — Parseo de IDs sintéticos `_next` / `_next_n` para ingresos proyectados
│   ├── ingresos.ts                   — Utilidades de recurrencia/proyección de ingresos
│   ├── presupuesto.ts                — Reserva operativa y helpers de presupuesto operativo
│   ├── recommendations.ts            — getRecomendacion(), getRecomendaciones() — lógica de pagos
│   ├── tags.ts                       — Compatibilidad `label/slug` para etiquetas
│   ├── utils.ts                      — cn() helper (clsx + tailwind-merge)
│   ├── webauthn.ts                   — Tipos/helpers cliente para passkeys
│   ├── webauthn-server.ts            — RP origin, cookies, generate/verify simplewebauthn
│   └── supabase/
│       ├── server.ts                 — createClient() + createAdminClient() con service role
│       ├── client.ts                 — createBrowserClient() para Client Components
│       └── middleware.ts             — updateSession() — refresca sesión en cada request
│
├── types/
│   ├── database.ts                   — Tipos del schema de Supabase (incluye presupuesto, tags JSONB y webauthn_credentials)
│   └── finus.ts                      — Interfaces de dominio (Recomendacion, CompromisoParaRecomendacion, etc.)
│
└── proxy.ts                          — Middleware de Next.js 16 (nombre "proxy", NO "middleware")
```

---

## Convenciones del proyecto

## Decisiones recientes de UX y producto

- En `/gastos`, el saldo disponible es contexto secundario: debe mostrarse en una variante compacta y expandible por cuenta, no como un hero card equivalente al dashboard.
- En `/gastos`, el chip `Rango` solo abre el editor de fechas; la URL y el filtro se actualizan hasta que el usuario pulsa `Aplicar rango`.
- En `/gastos`, cada grupo de transacciones por fecha debe mostrar un acumulado diario sutil a la derecha del encabezado.
- En móvil, `/gastos` debe estar optimizado para que las transacciones aparezcan antes: menos margen superior/lateral, filtros/KPIs más compactos y chips horizontales con scroll oculto.
- En `/ingresos`, los periodos deben respetar la fecha local `America/Merida`; `Mes actual` debe incluir correctamente el último día del mes local y excluir días del mes previo.
- Después de registrar un gasto, la UX esperada es: toast breve de éxito con saldos actualizados + `refresh` local de la pantalla actual.
- El dashboard debe mostrar el total vencido dentro del card `Compromisos vencidos a hoy`, debajo del título.
- En `Pagos fijos`, nuevas altas permitidas: `fijo`, `prestamo`, `suscripcion`.
- Los compromisos legacy `revolvente`, `msi` y `disposicion_efectivo` siguen siendo compatibles para lectura/visualización si ya existen, pero ya no deben darse de alta desde el flujo general de `Nuevo pago fijo`.
- El formateo monetario debe conservar centavos reales; evitar redondeo agresivo a enteros en saldos y montos visibles.

### Server vs Client Components

```
Server Component (default)     → fetch de datos, sin estado, sin eventos
Client Component ('use client') → useState, useTransition, event handlers
```

**Patrón estándar por vista:**

1. `page.tsx` (Server) — hace todos los `await supabase.from(...)` en paralelo con `Promise.all`
2. Pasa los datos como props a un `*Client.tsx` (Client) que gestiona el estado de formularios
3. Los formularios llaman Server Actions con `'use server'`

Nunca usar `useEffect` para cargar datos. Nunca hacer fetch en Client Components salvo el endpoint de streaming `/api/aconsejame`.

### Server Actions

Todas las mutations van en `actions.ts` junto a su page. Patrón:

```ts
'use server';
export async function miAccion(args): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  // ... mutación ...
  revalidatePath('/ruta');
  revalidatePath('/');
  return {};
}
```

### Supabase RPC para operaciones de saldo

**Nunca** modificar `cuentas.saldo_actual` con `.update()` directo. Siempre usar:

```ts
await supabase.rpc('incrementar_saldo', { p_cuenta_id: id, p_monto: monto });
await supabase.rpc('decrementar_saldo', { p_cuenta_id: id, p_monto: monto });
```

Estas RPCs tienen `security definer` y actualizan `updated_at` automáticamente.

**Cuándo se llaman:**

- `decrementar_saldo` → `registrarGasto` (si forma_pago es efectivo/débito) y `marcarPagado` (si se selecciona cuenta)
- `incrementar_saldo` → `confirmarIngreso` (si el ingreso tiene `cuenta_destino_id`)
- Los ingresos recurrentes proyectados generan IDs sintéticos con formato `${id}_next_${n}`; esos IDs solo existen en UI y deben resolverse al `originalId` antes de confirmar

### Tipos

- `src/types/database.ts` — schema exacto. Actualizar manualmente cuando el DB cambie. Incluye las RPCs en `Functions`.
- `src/types/finus.ts` — interfaces de dominio para lógica de negocio.
- Tipos del DB: `Database['public']['Tables']['nombre_tabla']['Row']`

### Formularios: Sheet vs Modal

Ambos usan `radix-ui` Dialog. No hay componente Sheet separado.

**Sheet (panel lateral deslizable):**

```tsx
<Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col
  bg-background shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right
  data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300">
```

**Modal centrado:**

```tsx
<Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2
  rounded-xl border bg-background p-5 shadow-xl data-[state=open]:animate-in
  data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
```

### Números y Supabase

**Supabase devuelve campos `numeric` como strings.** Siempre envolver en `Number()`:

```ts
// MAL — puede producir NaN o concatenación de strings
const total = item.monto * 2;

// BIEN
const total = Number(item.monto ?? 0) * 2;
```

Campos afectados: `monto`, `monto_esperado`, `monto_real`, `saldo_actual`, `monto_mensualidad`, `saldo_real`, `tasa_interes_anual`, `monto_estimado`, `limite_credito`, etc.

---

## Schema de Supabase

### `usuarios`

| Columna                 | Tipo                   |
| ----------------------- | ---------------------- |
| id                      | uuid (FK → auth.users) |
| email                   | text                   |
| nombre                  | text\|null             |
| avatar_url              | text\|null             |
| idle_lock_enabled       | boolean                |
| idle_lock_timeout_minutes | int                  |
| created_at / updated_at | timestamptz            |

### `cuentas`

| Columna                 | Tipo        | Notas                                       |
| ----------------------- | ----------- | ------------------------------------------- |
| id                      | uuid PK     |                                             |
| usuario_id              | uuid FK     |                                             |
| nombre                  | text        |                                             |
| tipo                    | enum        | `banco \| efectivo \| digital \| inversion` |
| saldo_actual            | numeric     | Solo modificar via RPC                      |
| color                   | text\|null  |                                             |
| icono                   | text\|null  |                                             |
| moneda                  | text        | default 'MXN'                               |
| **activa**              | boolean     | ⚠️ Es `activa` (femenino), NO `activo`      |
| created_at / updated_at | timestamptz |                                             |

### `tarjetas`

| Columna                 | Tipo          | Notas                                                  |
| ----------------------- | ------------- | ------------------------------------------------------ |
| id                      | uuid PK       |                                                        |
| usuario_id              | uuid FK       |                                                        |
| nombre                  | text          |                                                        |
| tipo                    | enum          | `credito \| departamental`                             |
| titular_tipo            | enum          | `personal \| pareja \| familiar \| empresa \| tercero` |
| limite_credito          | numeric       |                                                        |
| saldo_actual            | numeric       |                                                        |
| saldo_al_corte          | numeric\|null | Monto del estado de cuenta                             |
| pago_sin_intereses      | numeric\|null |                                                        |
| pago_minimo             | numeric\|null |                                                        |
| fecha_corte             | int\|null     | Día del mes                                            |
| fecha_limite_pago       | int\|null     | Día del mes                                            |
| tasa_interes_mensual    | numeric\|null | En tarjetas sí es mensual                              |
| **activa**              | boolean       | ⚠️ Es `activa` (femenino), NO `activo`                 |
| created_at / updated_at | timestamptz   |                                                        |

### `ingresos`

| Columna                           | Tipo          | Notas                                              |
| --------------------------------- | ------------- | -------------------------------------------------- |
| id                                | uuid PK       |                                                    |
| usuario_id                        | uuid FK       |                                                    |
| nombre                            | text          |                                                    |
| tipo                              | enum          | `fijo_recurrente \| proyecto_recurrente \| unico`  |
| es_recurrente                     | boolean       |                                                    |
| frecuencia                        | enum\|null    | `mensual \| quincenal \| semanal \| anual`         |
| dia_del_mes                       | int\|null     |                                                    |
| fecha_inicio / fecha_fin          | date\|null    |                                                    |
| indefinido                        | boolean       |                                                    |
| monto_fijo                        | numeric\|null | Monto fijo para recurrentes                        |
| **monto_esperado**                | numeric\|null | ⚠️ NO `monto`                                      |
| monto_minimo / monto_maximo       | numeric\|null |                                                    |
| **fecha_esperada**                | date\|null    | Fecha de cobro estimada                            |
| fecha_real                        | date\|null    | Fecha real al confirmar                            |
| monto_real                        | numeric\|null | Monto real al confirmar                            |
| estado                            | enum          | `confirmado \| pendiente \| en_riesgo \| esperado` |
| probabilidad                      | enum          | `alta \| media \| baja`                            |
| cuenta_destino_id                 | uuid\|null    | FK → cuentas; saldo se suma al confirmar           |
| forma_recepcion / concepto_fiscal | text\|null    |                                                    |
| requiere_factura                  | boolean       |                                                    |
| created_at / updated_at           | timestamptz   |                                                    |

### `compromisos`

| Columna                     | Tipo          | Notas                                                             |
| --------------------------- | ------------- | ----------------------------------------------------------------- |
| id                          | uuid PK       |                                                                   |
| usuario_id                  | uuid FK       |                                                                   |
| tarjeta_id                  | uuid\|null    | FK → tarjetas                                                     |
| nombre                      | text          |                                                                   |
| categoria                   | text\|null    |                                                                   |
| tipo_pago                   | enum          | `fijo \| revolvente \| msi \| prestamo \| disposicion_efectivo`   |
| **monto_mensualidad**       | numeric\|null | ⚠️ NO `msi_mensualidad`                                           |
| **fecha_proximo_pago**      | date\|null    | ⚠️ NO `fecha_vencimiento`                                         |
| **mensualidades_restantes** | int\|null     | ⚠️ NO `msi_mensualidades`                                         |
| fecha_inicio                | date\|null    |                                                                   |
| monto_original              | numeric\|null |                                                                   |
| meses_totales               | int\|null     |                                                                   |
| saldo_estimado              | numeric\|null |                                                                   |
| fecha_fin_estimada          | date\|null    |                                                                   |
| saldo_real                  | numeric\|null | Saldo real de la tarjeta                                          |
| pago_sin_intereses          | numeric\|null |                                                                   |
| pago_minimo                 | numeric\|null |                                                                   |
| fecha_corte                 | date\|null    | Fecha de corte                                                    |
| **tasa_interes_anual**      | numeric\|null | ⚠️ NO `tasa_interes_mensual`; dividir /12 para cálculos mensuales |
| prioridad                   | enum\|null    | `alta \| media \| baja`                                           |
| **activo**                  | boolean       | ⚠️ Es `activo` (masculino), NO `activa`                           |
| created_at / updated_at     | timestamptz   |                                                                   |

### `gastos_previstos`

| Columna                 | Tipo          | Notas                                                |
| ----------------------- | ------------- | ---------------------------------------------------- |
| id                      | uuid PK       |                                                      |
| usuario_id              | uuid FK       |                                                      |
| nombre                  | text          |                                                      |
| monto_estimado          | numeric       |                                                      |
| tipo_programacion       | enum          | `recurrente_aprox \| previsto_sin_fecha \| eventual` |
| frecuencia_dias         | int\|null     | Para `recurrente_aprox`                              |
| ultima_ocurrencia       | date\|null    |                                                      |
| mes                     | text\|null    | Formato `YYYY-MM` para `previsto_sin_fecha`          |
| ventana_dias            | int\|null     |                                                      |
| certeza                 | enum          | `alta \| media \| baja`                              |
| fecha_sugerida          | date\|null    | Calculada automáticamente                            |
| fecha_confirmada        | date\|null    | Confirmada por el usuario                            |
| realizado               | boolean       |                                                      |
| monto_real              | numeric\|null |                                                      |
| notas                   | text\|null    |                                                      |
| **activo**              | boolean       |                                                      |
| created_at / updated_at | timestamptz   |                                                      |

### `transacciones`

| Columna                       | Tipo        | Notas                                                  |
| ----------------------------- | ----------- | ------------------------------------------------------ |
| id                            | uuid PK     |                                                        |
| usuario_id                    | uuid FK     |                                                        |
| tipo                          | enum        | `ingreso \| gasto \| transferencia`                    |
| monto                         | numeric     |                                                        |
| fecha                         | date        |                                                        |
| descripcion                   | text\|null  |                                                        |
| categoria                     | text\|null  |                                                        |
| **subcategoria**              | text\|null  | Ej: `restaurante \| cocina_propia \| antojo \| delivery` — ver sección Presupuesto Operativo |
| **momento_del_dia**           | enum\|null  | `desayuno \| almuerzo \| cena \| snack \| sin_clasificar` — opcional, solo cuando aplica |
| **etiquetas**                 | jsonb\|null  | Array de objetos `{ slug, label }`; el código mantiene compatibilidad con etiquetas legacy |
| cuenta_id                     | uuid\|null  | FK → cuentas                                           |
| tarjeta_id                    | uuid\|null  | FK → tarjetas                                          |
| compromiso_id                 | uuid\|null  | FK → compromisos                                       |
| proyecto_proveedor_id         | uuid\|null  | FK → proyecto_proveedores                              |
| forma_pago                    | text\|null  | Se llena también desde pagos/abonos de compromisos para no caer en `otro` cuando el método ya se conoce |
| meses_msi                     | int\|null   |                                                        |
| es_recurrente                 | boolean     |                                                        |
| notas                         | text\|null  |                                                        |
| created_at                    | timestamptz |                                                        |
| ❌ **NO existe `ingreso_id`** | —           | Las transacciones no referencian ingresos directamente |

### `metas`

| Columna                 | Tipo        |
| ----------------------- | ----------- |
| id                      | uuid PK     |
| usuario_id              | uuid FK     |
| nombre                  | text        |
| monto_objetivo          | numeric     |
| monto_actual            | numeric     |
| fecha_objetivo          | date\|null  |
| activa                  | boolean     |
| created_at / updated_at | timestamptz |

### `presupuesto_operativo`

| Columna                  | Tipo          | Notas                                                                                      |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------ |
| id                       | uuid PK       |                                                                                            |
| usuario_id               | uuid FK       |                                                                                            |
| categoria                | text          | `comida \| gasolina \| despensa \| entretenimiento \| mascotas \| snacks \| transporte \| salud \| varios` |
| subcategoria             | text\|null    | Refinamiento opcional: `restaurante`, `cocina_propia`, etc.                               |
| frecuencia               | enum          | `diario \| semanal \| quincenal \| mensual`                                               |
| **monto_manual**         | numeric\|null | Ingresado por el usuario — fuente inicial siempre                                         |
| **monto_aprendido**      | numeric\|null | Calculado del historial de transacciones (promedio últimas 8 sem.)                        |
| **fuente_activa**        | enum          | `manual \| aprendido` — cuál número usa Finus para calcular reserva                      |
| **confianza**            | enum          | `baja \| media \| alta` — basado en semanas_de_datos                                     |
| semanas_de_datos         | int           | Semanas con al menos 1 transacción registrada en esta categoría                           |
| sugerencia_pendiente     | boolean       | TRUE cuando Finus detectó desviación >15% por 4+ semanas y aún no se acepta/ignora       |
| monto_sugerido           | numeric\|null | El nuevo monto que Finus quiere proponer                                                  |
| veces_ignorada           | int           | Si llega a 3, Finus no vuelve a sugerir esa partida automáticamente                      |
| **activo**               | boolean       | ⚠️ Es `activo` (masculino)                                                                |
| created_at / updated_at  | timestamptz   |                                                                                            |

### RPCs de Supabase

```sql
-- Definidas con security definer; actualizan updated_at
public.incrementar_saldo(p_cuenta_id uuid, p_monto numeric) → void
public.decrementar_saldo(p_cuenta_id uuid, p_monto numeric) → void

-- Calcula reserva operativa para los próximos N días
public.calcular_reserva_operativa(p_usuario_id uuid, p_dias int) → numeric
```

Tipadas en `database.ts` bajo `Functions` para que `.rpc()` no de error de TypeScript.

---

## Lógica de recomendaciones (`src/lib/recommendations.ts`)

`getRecomendacion(compromiso, saldoDisponible, ingresoProximo?, reservaOperativa?)` → `Recomendacion`

> ⚠️ El parámetro `reservaOperativa` se agregó para que la recomendación corra contra
> `saldoLibre = saldoDisponible - reservaOperativa` en lugar del saldo bruto.
> Esto hace que Finus reserve automáticamente lo necesario para gastos básicos antes
> de comprometer liquidez en pagos de deuda.
>
> Las fechas que aparecen en mensajes como “Espera al 15 abr” deben salir de `formatFecha()`
> para no depender de parseos UTC del navegador.

**Factores de ponderación:**

```
Probabilidad ingresos:    alta→0.9  media→0.5  baja→0.2
Certeza gastos previstos: alta→1.0  media→0.7  baja→0.4
```

**Lógica por `tipo_pago`:**

- `fijo` — pago completo o fondos insuficientes
- `msi` — mensualidad obligatoria (no pagar cancela el plan sin intereses retroactivamente)
- `prestamo` — cuota fija
- `revolvente` — 6 casos en cascada: liquidar total → pago corte sin intereses → entre mínimo+colchón(20%) y PSI → solo mínimo → esperar ingreso próximo → sin liquidez
- `disposicion_efectivo` — intereses desde día 1, liquidar urgente

**Colores de urgencia** (mayor = más urgente para ordenar):

```
rojo_fuerte(5) > rojo(4) > naranja(3) > morado(2) > amarillo(1) > verde(0)
```

---

## Presupuesto Operativo y Gastos Hormiga

### Filosofía

Antes de decidir cuánto pagar de cada deuda, Finus reserva un **piso de subsistencia**: lo que el usuario necesita para operar en el período (comida, gasolina, despensa, snacks, etc.). Esta reserva se descuenta del saldo disponible antes de correr cualquier recomendación de pago.

El objetivo secundario es hacer visibles los **gastos hormiga**: pequeños gastos recurrentes (cafés, antojos, delivery) que individualmente no duelen pero en conjunto pueden equivaler a la diferencia entre pagar el mínimo o liquidar una tarjeta. Finus los muestra con contexto financiero real, nunca con culpa ni regaño.

### Las tres etapas de aprendizaje

**Etapa 1 — Arranque manual** (día 0, sin historial)

El usuario declara sus gastos básicos estimados por categoría y frecuencia. Finus usa estos números inmediatamente. Todos los registros nacen con `fuente_activa: 'manual'` y `confianza: 'baja'`.

**Etapa 2 — Comparación silenciosa** (4–8 semanas)

Conforme el usuario registra gastos, Finus acumula `monto_aprendido` promediando las últimas 8 semanas de transacciones por categoría. No muestra nada al usuario todavía. Internamente marca `sugerencia_pendiente = true` cuando detecta desviación >15% sostenida por 4+ semanas consecutivas.

**Etapa 3 — Sugerencia no intrusiva** (cuando hay suficientes datos)

Finus muestra una notificación en la vista de Presupuesto Operativo:

> *"Llevo 6 semanas viendo tus gastos en comida. Tu gasto real es $1,840/semana, no $1,500. ¿Actualizo tu presupuesto operativo?"*

El usuario puede: **Aceptar** (cambia `fuente_activa → 'aprendido'`, `confianza → 'alta'`), **Ajustar manualmente**, o **Ignorar** (incrementa `veces_ignorada`; al llegar a 3 Finus deja de sugerir esa partida).

### Umbrales de confianza

| `semanas_de_datos` | `confianza` | Comportamiento en recomendaciones                                  |
| ------------------ | ----------- | ------------------------------------------------------------------ |
| 0–3                | `baja`      | Usa `monto_manual` + margen de seguridad del 20%                  |
| 4–7                | `media`     | Usa `monto_manual` sin margen adicional                           |
| 8+                 | `alta`      | Usa `monto_aprendido` si `fuente_activa = 'aprendido'`, sin margen |

### Función `calcularReservaOperativa` (`src/lib/presupuesto.ts`)

```ts
// Devuelve el monto a reservar para los próximos `dias` días
// basado en las partidas activas del presupuesto_operativo del usuario
export function calcularReservaOperativa(
  partidas: PresupuestoOperativo[],
  dias: number
): number {
  return partidas
    .filter(p => p.activo)
    .reduce((total, p) => {
      const monto = p.fuente_activa === 'aprendido' && p.monto_aprendido
        ? Number(p.monto_aprendido)
        : Number(p.monto_manual ?? 0)
      const margen = p.confianza === 'baja' ? 1.2 : 1.0
      const factor = p.frecuencia === 'diario'    ? dias
                   : p.frecuencia === 'semanal'   ? dias / 7
                   : p.frecuencia === 'quincenal' ? dias / 15
                   : dias / 30  // mensual
      return total + (monto * margen * factor)
    }, 0)
}
```

### Cómo se integra en el Dashboard

El `saldoLibre` que usa `getRecomendacion()` se calcula así:

```ts
const reserva = calcularReservaOperativa(partidas, diasHastaVencimiento)
const saldoLibre = saldoDisponible - reserva
const rec = getRecomendacion(compromiso, saldoLibre, ingresoProximo)
```

El dashboard muestra un KPI adicional: **"Reserva operativa"** con el monto calculado para los próximos 7 días, para que el usuario entienda por qué su liquidez real es menor que su saldo bruto.

### Clasificación granular de gastos (para detección de hormiga)

Los campos `subcategoria` y `momento_del_dia` en `transacciones` permiten análisis granular:

| `categoria` | `subcategoria` ejemplos                              | `momento_del_dia`               |
| ----------- | ---------------------------------------------------- | ------------------------------- |
| `comida`    | `restaurante`, `cocina_propia`, `antojo`, `delivery` | `desayuno \| almuerzo \| cena \| snack` |
| `gasolina`  | `lleno`, `emergencia`                                | —                               |
| `despensa`  | `supermercado`, `mercado`, `tienda`                  | —                               |
| `snacks`    | `cafe`, `antojo_dulce`, `botana`                     | `desayuno \| snack`             |

**Reglas de captura en el form de gastos:**
- `subcategoria` y `momento_del_dia` son **siempre opcionales** — nunca bloquear el guardado si no se llenan
- Cuando `categoria = 'comida'`, el form muestra los campos opcionales de subcategoría y momento del día
- Cuando `categoria = 'gasolina'`, el form muestra subcategoría opcional (`lleno`, `emergencia`)
- Con el tiempo, Finus pre-sugiere la subcategoría más frecuente del usuario a esa hora del día

**Análisis de gastos hormiga** (`src/lib/presupuesto.ts → detectarGastosHormiga()`):

Agrupa transacciones del mes por `categoria + subcategoria` y calcula:
- Suma del mes vs. promedio de los 3 meses anteriores
- Equivalencia en términos de deuda: *"tus antojos este mes = la diferencia entre pagar el corte o el mínimo de Stori"*
- Tendencia: si el gasto hormiga está subiendo o bajando respecto al mes anterior

El análisis es **descriptivo, nunca punitivo**. Finus presenta el número con contexto, no con un semáforo de "excediste tu presupuesto".

---

## Decisiones técnicas y por qué

| Decisión                                             | Razón                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `radix-ui` paquete unificado v1.4.3                  | Los paquetes `@radix-ui/react-*` separados tienen conflictos con React 19                       |
| `@base-ui/react` solo para Button                    | shadcn/ui tiene breaking changes con React 19 en la versión instalada                           |
| Un solo `Dialog` como Sheet y Modal                  | Evita duplicar abstracción; solo cambian las clases CSS de posicionamiento                      |
| Server Actions en lugar de API Routes para mutations | Menos boilerplate, tipado end-to-end, `revalidatePath` integrado                                |
| RPCs de Supabase para modificar saldo                | Atomicidad — evita race conditions si dos operaciones ocurren simultáneamente                   |
| `src/proxy.ts` con export `proxy`                    | Next.js 16 deprecó `src/middleware.ts` con export `middleware`                                  |
| Tipos manuales en `database.ts`                      | Supabase CLI no está configurado; se actualizan a mano cuando el schema cambia                  |
| Streaming para `/api/aconsejame`                     | Respuestas de Claude tardan 5-10s; streaming mejora UX notablemente                             |
| `claude-haiku-4-5-20251001` para Aconséjame          | Rápido y económico para análisis prescriptivo; max_tokens: 1000                                 |
| No actualizar saldo de tarjetas                      | La lógica de saldo de tarjetas es más compleja (ciclo de corte); se deja como trabajo pendiente |
| Passkeys propias con `simplewebauthn`                | Supabase WebAuthn MFA no era confiable en este proyecto; se implementó registro/login/unlock propio |
| Login con passkey emite sesión Supabase server-side  | El middleware ya depende de cookies Supabase; se reutiliza ese modelo con `service_role` + `verifyOtp` |
| Header mobile `sticky`, no `fixed`                   | Mantiene logo visible sin pelear con safe areas, pull-to-refresh ni overlays                    |
| `subcategoria` y `momento_del_dia` opcionales en transacciones | Nunca bloquear el registro de un gasto por campos de análisis; la captura granular es progresiva |
| `presupuesto_operativo` arranca con datos manuales   | Sin historial en el día 0, el sistema no puede aprender; la captura manual es el bootstrap necesario |
| RPC `calcular_reserva_operativa` en DB               | Permite al dashboard calcular la reserva en una sola llamada sin traer todas las partidas al cliente |

---

## Bugs resueltos — no repetir

### 1. `$NaN` en todos los montos

Supabase devuelve campos `numeric` como strings. Fix: `Number(valor ?? 0)` antes de cualquier aritmética.

### 2. Saldo mostrando `$0`

Campo real: `saldo_actual`, no `saldo`. Fix: verificar nombres de columna contra `database.ts`.

### 3. Compromisos sin aparecer en alertas

Campo real: `fecha_proximo_pago`, no `fecha_vencimiento`.

### 4. `column msi_mensualidades does not exist`

Campo real: `mensualidades_restantes`.

### 5. `column tasa_interes_mensual does not exist`

Campo real: `tasa_interes_anual`. Para cálculos mensuales dividir entre 12.

### 6. `column ingreso_id does not exist in transacciones`

La tabla `transacciones` no tiene referencia a ingresos. Columna eliminada del schema.

### 7. "To get started, edit page.tsx"

Existían `app/page.tsx` y `app/(dashboard)/page.tsx` — ambos resolvían a `/`. Fix: eliminar `app/page.tsx`.

### 8. Warning Next.js 16 sobre middleware deprecado

Fix: renombrar `src/middleware.ts` → `src/proxy.ts` y el export `middleware` → `proxy`.

### 9. Campos `activa` vs `activo`

- `cuentas` → `activa` (femenino) → `.eq('activa', true)`
- `tarjetas` → `activa` (femenino) → `.eq('activa', true)`
- `compromisos` → `activo` (masculino) → `.eq('activo', true)`
- `gastos_previstos` → `activo` (masculino) → `.eq('activo', true)`
- `presupuesto_operativo` → `activo` (masculino) → `.eq('activo', true)`

### 10. Error TypeScript en `.rpc()` con `[_ in never]`

El tipo `Functions: { [_ in never]: ... }` bloqueaba todas las llamadas a `.rpc()`. Fix: definir las funciones explícitamente en `database.ts` bajo `Functions`.

---

## Variables de entorno

```bash
# .env.local (está en .gitignore, nunca commitear)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # requerido para login completo con passkey
ANTHROPIC_API_KEY=sk-ant-...
```

El endpoint `/api/aconsejame` valida `ANTHROPIC_API_KEY` y retorna HTTP 500 con mensaje claro si no está configurada.
Los endpoints `/api/webauthn/login/*` requieren `SUPABASE_SERVICE_ROLE_KEY` para resolver el usuario por `credential_id` y emitir la sesión Supabase.

---

## Cómo correr el proyecto localmente

```bash
# 1. Clonar y instalar
git clone https://github.com/webadictos/finus.git
cd finus-app
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local   # o crear desde cero con las 4 variables

# 3. Correr dev server
npm run dev
# → http://localhost:3000

# 4. Verificar tipos
npx tsc --noEmit
```

Sin tests automatizados ni Storybook. El flujo de verificación es: `tsc --noEmit` para tipos, luego prueba manual en el browser.

---

## Lo que falta por construir

### Alta prioridad

- **Vista Metas** (`/metas`) — actualmente es un `<h1>Metas</h1>`. Necesita CRUD, barra de progreso hacia el objetivo, y conexión con cuentas de ahorro/inversión.
- **Configuración de cuentas y tarjetas** — no hay UI para agregar/editar cuentas ni tarjetas. El usuario de prueba las tiene insertadas directamente en Supabase.
- **Ajuste fino de passkey login en producción** — depende de `SUPABASE_SERVICE_ROLE_KEY` y de validar el flujo completo contra el proyecto real hospedado.

### Media prioridad

- **Actualizar saldo de tarjetas al gastar** — al registrar un gasto con `credito_revolvente` o `msi`, se crea la transacción pero `tarjetas.saldo_actual` no se modifica. Solo se actualiza `cuentas.saldo_actual` cuando la forma de pago es débito/efectivo.
- **Filtros avanzados en /gastos** — ya existen filtros por periodo y forma de pago; aún faltan, si se desean, categoría, subcategoría y etiqueta.
- **Análisis de gastos hormiga** — agregar panel en `/gastos` o `/presupuesto` con desglose por subcategoría y comparativa mes anterior.
- **Forzar/ajustar lock de inactividad** — hoy el timeout está en 5 minutos reales; falta si se desea una opción visible de “Bloquear ahora” o configuración del tiempo.

### Baja prioridad

- Gráfico de flujo de caja en `/proyeccion` (actualmente solo texto y números)
- Notificaciones push o email para vencimientos próximos
- Export a CSV
- Los endpoints `src/app/api/supabase/compromisos/route.ts` e `ingresos/route.ts` son placeholders vacíos que devuelven 501
- Job nocturno para recalcular `monto_aprendido` y detectar `sugerencia_pendiente` en `presupuesto_operativo`

---

---

## Rediseño del modelo de crédito — Abril 2026

### Contexto del cambio

El modelo original tenía `tarjetas` y `compromisos` como entidades paralelas.
El problema: para tarjetas de crédito y líneas de crédito digitales, el pago
es siempre **global contra la línea** (mínimo, sin intereses, o parcial) —
no contra cada compromiso individual. Los compromisos internos (revolvente,
MSI, disposición) son desglose informativo, no unidades de pago.

### Nuevas tablas (ya migradas en Supabase)

**`lineas_credito`** — reemplaza conceptualmente a `tarjetas`
Representa cualquier instrumento de crédito revolvente: tarjeta de crédito,
línea digital (Mercado Pago, Kueski), BNPL, departamental.

- El titular puede ser personal, pareja, familiar, empresa o tercero
- Las tarjetas de Tania se registran aquí con `titular_tipo = 'pareja'`
- Tiene los campos de estado de cuenta: `saldo_al_corte`, `pago_sin_intereses`,
  `pago_minimo`, `fecha_proximo_pago`

**`cargos_linea`** — desglose interno de cada línea
Solo se registran cargos que le corresponden al usuario. Si es tarjeta de
pareja, solo los cargos que Daniel generó o son compartidos.

- `tipo`: revolvente | msi | disposicion_efectivo
- Para MSI: `monto_mensualidad`, `mensualidades_totales`, `mensualidades_restantes`
- Para revolvente: solo `saldo_pendiente` (se actualiza cada corte)
- Si está en Finus, es del usuario — no hay campo `generado_por`

**`pagos_linea`** — historial de pagos reales
Cada vez que el usuario paga una línea queda registrado aquí con
`tipo_pago`: minimo | sin_intereses | parcial | total

### RPC nueva

`calcular_pago_sugerido_linea(p_linea_id)` → numeric
Suma mensualidades MSI activas + saldo revolvente de una línea.
La lógica de recomendación en `recommendations.ts` decide cuánto
del revolvente recomendar pagar según saldo disponible.

### Regla de negocio clave

Finus calcula automáticamente cuánto debe pagarle Daniel a Tania
cada mes sumando los `cargos_linea` activos de sus líneas.
Daniel no depende de que Tania le avise — Finus lo estima.

### Qué quedó igual

`compromisos` sigue existiendo pero SOLO para deudas de cuota fija:
préstamos personales (Bravo, BBVA), servicios (Telmex), seguros,
suscripciones. Todo lo que tiene cuota fija sin desglose interno.

`tarjetas` sigue en el schema por compatibilidad pero está deprecada.
No crear nuevos registros ahí. Usar `lineas_credito` en su lugar.

### Estado actual de lineas_credito (datos reales insertados)

| Línea     | Tipo            | Titular  | Vence                   | Pago mín | PSI     |
| --------- | --------------- | -------- | ----------------------- | -------- | ------- |
| Nu        | tarjeta_credito | personal | 13 abr                  | $1,158   | $11,492 |
| Stori     | tarjeta_credito | personal | 16 abr                  | $844     | $8,869  |
| DiDi Card | tarjeta_credito | personal | pendiente estado actual | —        | —       |

### Pendiente de insertar

- DiDi Card (esperar estado de cuenta de abril)
- Mercado Pago Crédito
- Liverpool (titular: Tania)
- Sears (titular: Daniel)
- Chapur (titular: Daniel)
- Tania BBVA revolvente
- Tania Santander MSI

### Actions implementadas en compromisos/actions.ts

**`crearLineaCredito(formData)`** — INSERT en `lineas_credito`.
`fecha_proximo_pago` se calcula desde `dia_limite_pago`: mes actual si aún
no ha pasado, mes siguiente si ya pasó.

**`actualizarLineaCredito(id, formData)`** — UPDATE en `lineas_credito`.
Misma lógica de cálculo de `fecha_proximo_pago`. Filtra por `usuario_id`
para prevenir edición cruzada.

**`eliminarLineaCredito(id)`** — DELETE en `lineas_credito`.
Las FK en `cargos_linea` y `pagos_linea` tienen `ON DELETE CASCADE`,
por lo que el delete borra automáticamente todos los cargos e historial
de pagos de la línea. No usar `activa = false` — eliminar físicamente.

**`pagarDesdePrestamo(compromisoId, prestamista, montoPrestamo, fechaDevolucion)`**
Flujo de dos pasos en una sola action:
1. Registra transacción de pago del compromiso original (monto = `monto_mensualidad`)
2. Avanza `fecha_proximo_pago` del compromiso (+1 mes)
3. Inserta un nuevo `compromisos` con:
   - `nombre`: `"Devolución a [prestamista]"`
   - `tipo_pago`: `'prestamo'`
   - `monto_mensualidad`: el monto que el usuario pidió prestado (puede ser ≥ al del compromiso)
   - `fecha_proximo_pago`: `fechaDevolucion`
   - `mensualidades_restantes`: `1`
   - `prioridad`: `'alta'`
   - `activo`: `true`

No descuenta saldo de ninguna cuenta (el dinero viene de un préstamo externo,
no de una cuenta registrada en Finus).

### Componentes del nuevo modelo

**`NuevaLineaForm`** — Sheet deslizable para crear o editar líneas.
Acepta dos props opcionales que activan modos distintos:
- `lineaId?: string` — si está presente, el form es de edición; llama
  `actualizarLineaCredito` en lugar de `crearLineaCredito`
- `initialValues?: LineaInitialValues` — pre-llena todos los campos del form.
  Sirve tanto para edición (se pasa la línea actual) como para la migración
  desde `tarjetas` (se pasa el mapeo de campos)

**`LineaCreditoCard`** — menú de 3 puntos (`DropdownMenu` de `radix-ui`)
en la esquina superior derecha de cada card:
- "Editar" → abre `NuevaLineaForm` con `lineaId` e `initialValues` pre-llenados
- "Eliminar" → abre `Dialog` de confirmación; al confirmar llama
  `eliminarLineaCredito`

**`PagarModal`** (tab Pagos fijos / compromisos) — 4ª opción rápida
"Pagar desde préstamo" junto a Completo / Sin intereses / Mínimo.
Al seleccionarla aparece un subformulario inline dentro del mismo modal:
- `prestamista` (text) — quién presta
- `monto_prestamo` (number) — default = `monto_mensualidad`, editable
- `fecha_devolucion` (date) — plazo para devolver

Al confirmar llama `pagarDesdePrestamo` en lugar de `marcarPagado`.

**`CopiarTarjetaButton`** (`src/components/tarjetas/CopiarTarjetaButton.tsx`)
Botón ícono `CopyPlus` que aparece en cada fila de `/tarjetas`.
Abre `NuevaLineaForm` pre-llenado con el mapeo:

| `tarjetas`             | → | `lineas_credito` (initialValues)           |
| ---------------------- | - | ------------------------------------------ |
| `nombre`               | → | `nombre`                                   |
| `banco`                | → | `banco`                                    |
| `tipo`                 | → | `'tarjeta_credito'` (fijo, no se mapea)    |
| `titular_tipo`         | → | `titular_tipo`                             |
| `titular_nombre`       | → | `titular_nombre`                           |
| `ultimos_4`            | → | `ultimos_4`                                |
| `limite_credito`       | → | `limite_credito`                           |
| `saldo_al_corte`       | → | `saldo_al_corte`                           |
| `pago_sin_intereses`   | → | `pago_sin_intereses`                       |
| `pago_minimo`          | → | `pago_minimo`                              |
| `dia_corte`            | → | `dia_corte`                                |
| `dia_limite_pago`      | → | `dia_limite_pago`                          |
| `tasa_interes_mensual` | → | `tasa_interes_anual` (**× 12**)            |

La tarjeta original **no se elimina automáticamente** — el usuario la borra
manualmente desde `/tarjetas` cuando confirme que la migración está correcta.

### Bugs a evitar con el nuevo modelo

- Nunca modificar `saldo_actual` de `lineas_credito` directamente —
  usar RPC o recalcular desde `cargos_linea`
- `cargos_linea.activo` se pone en `false` cuando el MSI termina
  (mensualidades_restantes llega a 0), no se elimina el registro
- El saldo revolvente solo debe tener UN cargo activo por línea
- Supabase devuelve `numeric` como string — siempre `Number(valor ?? 0)`
- `tasa_interes_mensual` (tarjetas) ≠ `tasa_interes_anual` (lineas_credito) —
  al copiar multiplicar × 12; al usar en cálculos mensuales dividir / 12

## Repositorio

```
https://github.com/webadictos/finus.git
branch principal: main
```
