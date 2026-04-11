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
          tipo: 'credito' | 'departamental'
          titular_tipo: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          limite_credito: number
          saldo_actual: number
          saldo_al_corte: number | null
          pago_sin_intereses: number | null
          pago_minimo: number | null
          fecha_corte: number | null
          fecha_limite_pago: number | null
          tasa_interes_mensual: number | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          tipo: 'credito' | 'departamental'
          titular_tipo?: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          limite_credito?: number
          saldo_actual?: number
          saldo_al_corte?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          fecha_corte?: number | null
          fecha_limite_pago?: number | null
          tasa_interes_mensual?: number | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          tipo?: 'credito' | 'departamental'
          titular_tipo?: 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'
          limite_credito?: number
          saldo_actual?: number
          saldo_al_corte?: number | null
          pago_sin_intereses?: number | null
          pago_minimo?: number | null
          fecha_corte?: number | null
          fecha_limite_pago?: number | null
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
          monto_esperado: number
          moneda: string
          fecha_esperada: string | null
          fecha_real: string | null
          recurrente_dia: number | null
          estado: 'confirmado' | 'pendiente' | 'en_riesgo' | 'esperado'
          probabilidad: 'alta' | 'media' | 'baja'
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          tipo: 'fijo_recurrente' | 'proyecto_recurrente' | 'unico'
          monto_esperado: number
          moneda?: string
          fecha_esperada?: string | null
          fecha_real?: string | null
          recurrente_dia?: number | null
          estado?: 'confirmado' | 'pendiente' | 'en_riesgo' | 'esperado'
          probabilidad?: 'alta' | 'media' | 'baja'
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          tipo?: 'fijo_recurrente' | 'proyecto_recurrente' | 'unico'
          monto_esperado?: number
          moneda?: string
          fecha_esperada?: string | null
          fecha_real?: string | null
          recurrente_dia?: number | null
          estado?: 'confirmado' | 'pendiente' | 'en_riesgo' | 'esperado'
          probabilidad?: 'alta' | 'media' | 'baja'
          notas?: string | null
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
          tipo_pago: 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'disposicion_efectivo'
          saldo_real: number | null
          monto_mensualidad: number | null
          pago_minimo: number | null
          pago_sin_intereses: number | null
          msi_mensualidades: number | null
          msi_mensualidad: number | null
          tasa_interes_mensual: number | null
          fecha_proximo_pago: string | null
          dia_pago: number | null
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
          tipo_pago: 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'disposicion_efectivo'
          saldo_real?: number | null
          monto_mensualidad?: number | null
          pago_minimo?: number | null
          pago_sin_intereses?: number | null
          msi_mensualidades?: number | null
          msi_mensualidad?: number | null
          tasa_interes_mensual?: number | null
          fecha_proximo_pago?: string | null
          dia_pago?: number | null
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
          tipo_pago?: 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'disposicion_efectivo'
          saldo_real?: number | null
          monto_mensualidad?: number | null
          pago_minimo?: number | null
          pago_sin_intereses?: number | null
          msi_mensualidades?: number | null
          msi_mensualidad?: number | null
          tasa_interes_mensual?: number | null
          fecha_proximo_pago?: string | null
          dia_pago?: number | null
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
          tipo_programacion: 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'
          monto_estimado: number
          certeza: 'alta' | 'media' | 'baja'
          fecha_estimada: string | null
          mes_estimado: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          tipo_programacion: 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'
          monto_estimado: number
          certeza?: 'alta' | 'media' | 'baja'
          fecha_estimada?: string | null
          mes_estimado?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          tipo_programacion?: 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'
          monto_estimado?: number
          certeza?: 'alta' | 'media' | 'baja'
          fecha_estimada?: string | null
          mes_estimado?: string | null
          notas?: string | null
          updated_at?: string
        }
        Relationships: Rel[]
      }
      transacciones: {
        Row: {
          id: string
          usuario_id: string
          cuenta_id: string | null
          tarjeta_id: string | null
          ingreso_id: string | null
          compromiso_id: string | null
          monto: number
          tipo: 'ingreso' | 'gasto' | 'transferencia'
          descripcion: string | null
          fecha: string
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          cuenta_id?: string | null
          tarjeta_id?: string | null
          ingreso_id?: string | null
          compromiso_id?: string | null
          monto: number
          tipo: 'ingreso' | 'gasto' | 'transferencia'
          descripcion?: string | null
          fecha: string
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          cuenta_id?: string | null
          tarjeta_id?: string | null
          ingreso_id?: string | null
          compromiso_id?: string | null
          monto?: number
          tipo?: 'ingreso' | 'gasto' | 'transferencia'
          descripcion?: string | null
          fecha?: string
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
      [_ in never]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: string
    }
  }
}
