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
          monto_fijo: number | null
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
          monto_fijo?: number | null
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
          monto_fijo?: number | null
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
          cuenta_id: string | null
          tarjeta_id: string | null
          compromiso_id: string | null
          proyecto_proveedor_id: string | null
          forma_pago: string | null
          meses_msi: number | null
          es_recurrente: boolean
          notas: string | null
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
          cuenta_id?: string | null
          tarjeta_id?: string | null
          compromiso_id?: string | null
          proyecto_proveedor_id?: string | null
          forma_pago?: string | null
          meses_msi?: number | null
          es_recurrente?: boolean
          notas?: string | null
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
          cuenta_id?: string | null
          tarjeta_id?: string | null
          compromiso_id?: string | null
          proyecto_proveedor_id?: string | null
          forma_pago?: string | null
          meses_msi?: number | null
          es_recurrente?: boolean
          notas?: string | null
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
    }
    Enums: {
      [_ in never]: string
    }
  }
}
