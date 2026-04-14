// Tipos generados del schema de Supabase
// Actualizar con: npx supabase gen types typescript --project-id <project-id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Alias para mantener compatibilidad con GenericRelationship de @supabase/supabase-js
type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nombre?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: Rel[]
      }
      cuentas: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          tipo: 'banco' | 'efectivo' | 'digital' | 'inversion'
          saldo_actual: number
          tiene_tarjeta_debito: boolean
          ultimos_4_debito: string | null
          color: string | null
          icono: string | null
          moneda: string
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          tipo: 'banco' | 'efectivo' | 'digital' | 'inversion'
          saldo_actual?: number
          tiene_tarjeta_debito?: boolean
          ultimos_4_debito?: string | null
          color?: string | null
          icono?: string | null
          moneda?: string
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          tipo?: 'banco' | 'efectivo' | 'digital' | 'inversion'
          saldo_actual?: number
          tiene_tarjeta_debito?: boolean
          ultimos_4_debito?: string | null
          color?: string | null
          icono?: string | null
          moneda?: string
          activa?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      tarjetas: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          banco: string
          tipo: 'credito' | 'departamental'
          titular_tipo: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          limite_credito: number
          saldo_actual: number
          saldo_al_corte: number | null
          pago_sin_intereses: number | null
          pago_minimo: number | null
          titular_nombre: string | null
          ultimos_4: string | null
          dia_corte: number | null
          dia_limite_pago: number | null
          tasa_interes_mensual: number | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          banco: string
          tipo: 'credito' | 'departamental'
          titular_tipo?: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          titular_nombre?: string | null
          ultimos_4?: string | null
          limite_credito?: number
          saldo_actual?: number
          saldo_al_corte?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          dia_corte?: number | null
          dia_limite_pago?: number | null
          tasa_interes_mensual?: number | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          banco?: string
          tipo?: 'credito' | 'departamental'
          titular_tipo?: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          titular_nombre?: string | null
          ultimos_4?: string | null
          limite_credito?: number
          saldo_actual?: number
          saldo_al_corte?: number | null
          pago_sin_intereses?: number | null
          dia_corte?: number | null
          dia_limite_pago?: number | null
          tasa_interes_mensual?: number | null
          activa?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      ingresos: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          tipo: 'fijo_recurrente' | 'proyecto_recurrente' | 'unico'
          es_recurrente: boolean
          frecuencia: 'mensual' | 'quincenal' | 'semanal' | 'anual' | null
          dia_del_mes: number | null
          fecha_inicio: string | null
          fecha_fin: string | null
          indefinido: boolean
          monto_fijo: boolean | null
          monto_esperado: number | null
          monto_minimo: number | null
          monto_maximo: number | null
          fecha_esperada: string | null
          fecha_real: string | null
          monto_real: number | null
          estado: 'confirmado' | 'pendiente' | 'en_riesgo' | 'esperado'
          probabilidad: 'alta' | 'media' | 'baja'
          cuenta_destino_id: string | null
          forma_recepcion: string | null
          concepto_fiscal: string | null
          requiere_factura: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          tipo: 'fijo_recurrente' | 'proyecto_recurrente' | 'unico'
          es_recurrente?: boolean
          frecuencia?: 'mensual' | 'quincenal' | 'semanal' | 'anual' | null
          dia_del_mes?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          indefinido?: boolean
          monto_fijo?: boolean | null
          monto_esperado?: number | null
          monto_minimo?: number | null
          monto_maximo?: number | null
          fecha_esperada?: string | null
          fecha_real?: string | null
          monto_real?: number | null
          estado?: 'confirmado' | 'pendiente' | 'en_riesgo' | 'esperado'
          probabilidad?: 'alta' | 'media' | 'baja'
          cuenta_destino_id?: string | null
          forma_recepcion?: string | null
          concepto_fiscal?: string | null
          requiere_factura?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          tipo?: 'fijo_recurrente' | 'proyecto_recurrente' | 'unico'
          es_recurrente?: boolean
          frecuencia?: 'mensual' | 'quincenal' | 'semanal' | 'anual' | null
          dia_del_mes?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          indefinido?: boolean
          monto_fijo?: boolean | null
          monto_esperado?: number | null
          monto_minimo?: number | null
          monto_maximo?: number | null
          fecha_esperada?: string | null
          fecha_real?: string | null
          monto_real?: number | null
          estado?: 'confirmado' | 'pendiente' | 'en_riesgo' | 'esperado'
          probabilidad?: 'alta' | 'media' | 'baja'
          cuenta_destino_id?: string | null
          forma_recepcion?: string | null
          concepto_fiscal?: string | null
          requiere_factura?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      compromisos: {
        Row: {
          id: string
          usuario_id: string
          tarjeta_id: string | null
          nombre: string
          categoria: string | null
          // ⚠️ 'suscripcion' requiere migración: ALTER TYPE tipo_pago ADD VALUE 'suscripcion';
          tipo_pago: 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'suscripcion' | 'disposicion_efectivo'
          // ⚠️ frecuencia requiere migración: ALTER TABLE compromisos ADD COLUMN frecuencia text;
          frecuencia: 'mensual' | 'quincenal' | 'semanal' | 'anual' | null
          monto_mensualidad: number | null
          fecha_proximo_pago: string | null
          mensualidades_restantes: number | null
          fecha_inicio: string | null
          monto_original: number | null
          meses_totales: number | null
          saldo_estimado: number | null
          fecha_fin_estimada: string | null
          saldo_real: number | null
          pago_sin_intereses: number | null
          pago_minimo: number | null
          fecha_corte: string | null
          tasa_interes_anual: number | null
          prioridad: 'alta' | 'media' | 'baja' | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          tarjeta_id?: string | null
          nombre: string
          categoria?: string | null
          tipo_pago: 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'suscripcion' | 'disposicion_efectivo'
          frecuencia?: 'mensual' | 'quincenal' | 'semanal' | 'anual' | null
          monto_mensualidad?: number | null
          fecha_proximo_pago?: string | null
          mensualidades_restantes?: number | null
          fecha_inicio?: string | null
          monto_original?: number | null
          meses_totales?: number | null
          saldo_estimado?: number | null
          fecha_fin_estimada?: string | null
          saldo_real?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          fecha_corte?: string | null
          tasa_interes_anual?: number | null
          prioridad?: 'alta' | 'media' | 'baja' | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          tarjeta_id?: string | null
          nombre?: string
          categoria?: string | null
          tipo_pago?: 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'suscripcion' | 'disposicion_efectivo'
          frecuencia?: 'mensual' | 'quincenal' | 'semanal' | 'anual' | null
          monto_mensualidad?: number | null
          fecha_proximo_pago?: string | null
          mensualidades_restantes?: number | null
          fecha_inicio?: string | null
          monto_original?: number | null
          meses_totales?: number | null
          saldo_estimado?: number | null
          fecha_fin_estimada?: string | null
          saldo_real?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          fecha_corte?: string | null
          tasa_interes_anual?: number | null
          prioridad?: 'alta' | 'media' | 'baja' | null
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      gastos_previstos: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          monto_estimado: number
          tipo_programacion: 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'
          frecuencia_dias: number | null
          ultima_ocurrencia: string | null
          mes: string | null
          ventana_dias: number | null
          certeza: 'alta' | 'media' | 'baja'
          fecha_sugerida: string | null
          fecha_confirmada: string | null
          realizado: boolean
          monto_real: number | null
          notas: string | null
          activo: boolean
          transaccion_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          monto_estimado: number
          tipo_programacion: 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'
          frecuencia_dias?: number | null
          ultima_ocurrencia?: string | null
          mes?: string | null
          ventana_dias?: number | null
          certeza?: 'alta' | 'media' | 'baja'
          fecha_sugerida?: string | null
          fecha_confirmada?: string | null
          realizado?: boolean
          monto_real?: number | null
          notas?: string | null
          activo?: boolean
          transaccion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          monto_estimado?: number
          tipo_programacion?: 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'
          frecuencia_dias?: number | null
          ultima_ocurrencia?: string | null
          mes?: string | null
          ventana_dias?: number | null
          certeza?: 'alta' | 'media' | 'baja'
          fecha_sugerida?: string | null
          fecha_confirmada?: string | null
          realizado?: boolean
          monto_real?: number | null
          notas?: string | null
          activo?: boolean
          transaccion_id?: string | null
          updated_at?: string
        }
        Relationships: Rel[]
      }
      transacciones: {
        Row: {
          id: string
          usuario_id: string
          tipo: 'ingreso' | 'gasto' | 'transferencia'
          monto: number
          fecha: string
          descripcion: string | null
          categoria: string | null
          subcategoria: string | null
          momento_del_dia: 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'sin_clasificar' | null
          cuenta_id: string | null
          tarjeta_id: string | null
          compromiso_id: string | null
          proyecto_proveedor_id: string | null
          forma_pago: string | null
          meses_msi: number | null
          es_recurrente: boolean
          notas: string | null
          etiquetas: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          tipo: 'ingreso' | 'gasto' | 'transferencia'
          monto: number
          fecha: string
          descripcion?: string | null
          categoria?: string | null
          subcategoria?: string | null
          momento_del_dia?: 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'sin_clasificar' | null
          cuenta_id?: string | null
          tarjeta_id?: string | null
          compromiso_id?: string | null
          proyecto_proveedor_id?: string | null
          forma_pago?: string | null
          meses_msi?: number | null
          es_recurrente?: boolean
          notas?: string | null
          etiquetas?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          tipo?: 'ingreso' | 'gasto' | 'transferencia'
          monto?: number
          fecha?: string
          descripcion?: string | null
          categoria?: string | null
          subcategoria?: string | null
          momento_del_dia?: 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'sin_clasificar' | null
          cuenta_id?: string | null
          tarjeta_id?: string | null
          compromiso_id?: string | null
          proyecto_proveedor_id?: string | null
          forma_pago?: string | null
          meses_msi?: number | null
          es_recurrente?: boolean
          notas?: string | null
          etiquetas?: Json | null
        }
        Relationships: Rel[]
      }
      proyectos: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          descripcion: string | null
          fecha_evento: string | null
          total_comprometido: number
          total_abonado: number
          total_pendiente: number
          techo_gasto: number | null
          estado: 'planeando' | 'en_curso' | 'completado' | 'cancelado'
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          descripcion?: string | null
          fecha_evento?: string | null
          total_comprometido?: number
          total_abonado?: number
          total_pendiente?: number
          techo_gasto?: number | null
          estado?: 'planeando' | 'en_curso' | 'completado' | 'cancelado'
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          descripcion?: string | null
          fecha_evento?: string | null
          total_comprometido?: number
          total_abonado?: number
          total_pendiente?: number
          techo_gasto?: number | null
          estado?: 'planeando' | 'en_curso' | 'completado' | 'cancelado'
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      proyecto_proveedores: {
        Row: {
          id: string
          proyecto_id: string
          usuario_id: string
          nombre: string
          categoria: string | null
          monto_total: number
          anticipo_requerido: number | null
          fecha_anticipo: string | null
          fecha_limite_liquidacion: string
          monto_abonado: number
          monto_pendiente: number
          estado: 'sin_anticipo' | 'anticipo_pagado' | 'abonando' | 'liquidado' | 'cancelado'
          notas: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          usuario_id: string
          nombre: string
          categoria?: string | null
          monto_total: number
          anticipo_requerido?: number | null
          fecha_anticipo?: string | null
          fecha_limite_liquidacion: string
          monto_abonado?: number
          monto_pendiente?: number
          estado?: 'sin_anticipo' | 'anticipo_pagado' | 'abonando' | 'liquidado' | 'cancelado'
          notas?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          usuario_id?: string
          nombre?: string
          categoria?: string | null
          monto_total?: number
          anticipo_requerido?: number | null
          fecha_anticipo?: string | null
          fecha_limite_liquidacion?: string
          monto_abonado?: number
          monto_pendiente?: number
          estado?: 'sin_anticipo' | 'anticipo_pagado' | 'abonando' | 'liquidado' | 'cancelado'
          notas?: string | null
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      acuerdos_pago: {
        Row: {
          id: string
          usuario_id: string
          compromiso_id: string
          monto_acordado: number
          fecha_acuerdo: string
          fecha_limite: string
          monto_abonado: number
          monto_pendiente: number
          estado: 'activo' | 'cumplido' | 'incumplido'
          notas: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          compromiso_id: string
          monto_acordado: number
          fecha_acuerdo?: string
          fecha_limite: string
          monto_abonado?: number
          monto_pendiente?: number
          estado?: 'activo' | 'cumplido' | 'incumplido'
          notas?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          compromiso_id?: string
          monto_acordado?: number
          fecha_acuerdo?: string
          fecha_limite?: string
          monto_abonado?: number
          monto_pendiente?: number
          estado?: 'activo' | 'cumplido' | 'incumplido'
          notas?: string | null
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      lineas_credito: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          banco: string | null
          tipo: 'tarjeta_credito' | 'linea_digital' | 'bnpl' | 'departamental'
          titular_tipo: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          titular_nombre: string | null
          ultimos_4: string | null
          limite_credito: number | null
          saldo_actual: number
          saldo_al_corte: number | null
          pago_sin_intereses: number | null
          pago_minimo: number | null
          fecha_proximo_pago: string | null
          dia_corte: number | null
          dia_limite_pago: number | null
          tasa_interes_anual: number | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          banco?: string | null
          tipo: 'tarjeta_credito' | 'linea_digital' | 'bnpl' | 'departamental'
          titular_tipo?: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          titular_nombre?: string | null
          ultimos_4?: string | null
          limite_credito?: number | null
          saldo_actual?: number
          saldo_al_corte?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          fecha_proximo_pago?: string | null
          dia_corte?: number | null
          dia_limite_pago?: number | null
          tasa_interes_anual?: number | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          banco?: string | null
          tipo?: 'tarjeta_credito' | 'linea_digital' | 'bnpl' | 'departamental'
          titular_tipo?: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          titular_nombre?: string | null
          ultimos_4?: string | null
          limite_credito?: number | null
          saldo_actual?: number
          saldo_al_corte?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          fecha_proximo_pago?: string | null
          dia_corte?: number | null
          dia_limite_pago?: number | null
          tasa_interes_anual?: number | null
          activa?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      cargos_linea: {
        Row: {
          id: string
          linea_credito_id: string
          usuario_id: string
          nombre: string
          tipo: 'revolvente' | 'msi' | 'disposicion_efectivo'
          monto_original: number
          monto_mensualidad: number | null
          mensualidades_totales: number | null
          mensualidades_restantes: number | null
          saldo_pendiente: number
          tasa_efectiva_anual: number | null
          notas: string | null
          fecha_compra: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          linea_credito_id: string
          usuario_id: string
          nombre: string
          tipo: 'revolvente' | 'msi' | 'disposicion_efectivo'
          monto_original: number
          monto_mensualidad?: number | null
          mensualidades_totales?: number | null
          mensualidades_restantes?: number | null
          saldo_pendiente: number
          tasa_efectiva_anual?: number | null
          notas?: string | null
          fecha_compra?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          linea_credito_id?: string
          usuario_id?: string
          nombre?: string
          tipo?: 'revolvente' | 'msi' | 'disposicion_efectivo'
          monto_original?: number
          monto_mensualidad?: number | null
          mensualidades_totales?: number | null
          mensualidades_restantes?: number | null
          saldo_pendiente?: number
          tasa_efectiva_anual?: number | null
          notas?: string | null
          fecha_compra?: string | null
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      pagos_linea: {
        Row: {
          id: string
          linea_credito_id: string
          usuario_id: string
          fecha: string
          monto_pagado: number
          tipo_pago: 'minimo' | 'sin_intereses' | 'parcial' | 'total'
          cuenta_origen_id: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          linea_credito_id: string
          usuario_id: string
          fecha?: string
          monto_pagado: number
          tipo_pago?: 'minimo' | 'sin_intereses' | 'parcial' | 'total'
          cuenta_origen_id?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          linea_credito_id?: string
          usuario_id?: string
          fecha?: string
          monto_pagado?: number
          tipo_pago?: 'minimo' | 'sin_intereses' | 'parcial' | 'total'
          cuenta_origen_id?: string | null
          notas?: string | null
        }
        Relationships: Rel[]
      }
      prestamos_dados: {
        Row: {
          id: string
          usuario_id: string
          deudor: string
          monto_prestado: number
          monto_a_recuperar: number
          fecha_prestamo: string
          fecha_devolucion: string | null
          monto_recuperado: number
          estado: 'pendiente' | 'parcial' | 'recuperado' | 'incobrable'
          notas: string | null
          cuenta_origen_id: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          deudor: string
          monto_prestado: number
          monto_a_recuperar: number
          fecha_prestamo?: string
          fecha_devolucion?: string | null
          monto_recuperado?: number
          estado?: 'pendiente' | 'parcial' | 'recuperado' | 'incobrable'
          notas?: string | null
          cuenta_origen_id?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          deudor?: string
          monto_prestado?: number
          monto_a_recuperar?: number
          fecha_prestamo?: string
          fecha_devolucion?: string | null
          monto_recuperado?: number
          estado?: 'pendiente' | 'parcial' | 'recuperado' | 'incobrable'
          notas?: string | null
          cuenta_origen_id?: string | null
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      metas: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          monto_objetivo: number
          monto_actual: number
          fecha_objetivo: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          monto_objetivo: number
          monto_actual?: number
          fecha_objetivo?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          monto_objetivo?: number
          monto_actual?: number
          fecha_objetivo?: string | null
          activa?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      presupuesto_operativo: {
        Row: {
          id: string
          usuario_id: string
          categoria:
            | 'comida'
            | 'gasolina'
            | 'despensa'
            | 'entretenimiento'
            | 'mascotas'
            | 'snacks'
            | 'transporte'
            | 'salud'
            | 'varios'
          subcategoria: string | null
          frecuencia: 'diario' | 'semanal' | 'quincenal' | 'mensual'
          monto_manual: number | null
          monto_aprendido: number | null
          fuente_activa: 'manual' | 'aprendido'
          confianza: 'baja' | 'media' | 'alta'
          semanas_de_datos: number
          sugerencia_pendiente: boolean
          monto_sugerido: number | null
          veces_ignorada: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          categoria:
            | 'comida'
            | 'gasolina'
            | 'despensa'
            | 'entretenimiento'
            | 'mascotas'
            | 'snacks'
            | 'transporte'
            | 'salud'
            | 'varios'
          subcategoria?: string | null
          frecuencia: 'diario' | 'semanal' | 'quincenal' | 'mensual'
          monto_manual?: number | null
          monto_aprendido?: number | null
          fuente_activa?: 'manual' | 'aprendido'
          confianza?: 'baja' | 'media' | 'alta'
          semanas_de_datos?: number
          sugerencia_pendiente?: boolean
          monto_sugerido?: number | null
          veces_ignorada?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          categoria?:
            | 'comida'
            | 'gasolina'
            | 'despensa'
            | 'entretenimiento'
            | 'mascotas'
            | 'snacks'
            | 'transporte'
            | 'salud'
            | 'varios'
          subcategoria?: string | null
          frecuencia?: 'diario' | 'semanal' | 'quincenal' | 'mensual'
          monto_manual?: number | null
          monto_aprendido?: number | null
          fuente_activa?: 'manual' | 'aprendido'
          confianza?: 'baja' | 'media' | 'alta'
          semanas_de_datos?: number
          sugerencia_pendiente?: boolean
          monto_sugerido?: number | null
          veces_ignorada?: number
          activo?: boolean
          updated_at?: string
        }
        Relationships: Rel[]
      }
      webauthn_credentials: {
        Row: {
          id: string
          user_id: string
          credential_id: string
          public_key: string
          counter: number
          device_name: string | null
          transports: string[] | null
          device_type: string | null
          backed_up: boolean
          last_used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credential_id: string
          public_key: string
          counter?: number
          device_name?: string | null
          transports?: string[] | null
          device_type?: string | null
          backed_up?: boolean
          last_used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credential_id?: string
          public_key?: string
          counter?: number
          device_name?: string | null
          transports?: string[] | null
          device_type?: string | null
          backed_up?: boolean
          last_used_at?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
    }
    Views: {
      [_ in never]: {
        Row: Record<string, unknown>
        Relationships: Rel[]
      }
    }
    Functions: {
      incrementar_saldo: {
        Args: { p_cuenta_id: string; p_monto: number }
        Returns: void
      }
      decrementar_saldo: {
        Args: { p_cuenta_id: string; p_monto: number }
        Returns: void
      }
      recalcular_proyecto: {
        Args: { p_proyecto_id: string }
        Returns: void
      }
      calcular_pago_sugerido_linea: {
        Args: { p_linea_id: string }
        Returns: number
      }
      decrementar_saldo_linea: {
        Args: { p_linea_id: string; p_monto: number }
        Returns: void
      }
      calcular_reserva_operativa: {
        Args: { p_usuario_id: string; p_dias: number }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: string
    }
  }
}
