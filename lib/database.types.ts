// Database types for Supabase
// Generated based on our data models

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DayTag = 'event' | 'short-staffed' | 'bad-weather' | 'promotion' | 'holiday' | 'slow-day';

export interface Database {
  public: {
    Tables: {
      actual_data: {
        Row: {
          id: string
          user_id: string
          date: string
          actual_orders: number
          actual_revenue: number
          labor_hours: number | null
          labor_cost: number | null
          notes: string | null
          tags: DayTag[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          actual_orders: number
          actual_revenue: number
          labor_hours?: number | null
          labor_cost?: number | null
          notes?: string | null
          tags?: DayTag[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          actual_orders?: number
          actual_revenue?: number
          labor_hours?: number | null
          labor_cost?: number | null
          notes?: string | null
          tags?: DayTag[] | null
          created_at?: string
          updated_at?: string
        }
      }
      custom_prep_tasks: {
        Row: {
          id: string
          user_id: string
          task: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task?: string
          created_at?: string
        }
      }
      custom_inventory: {
        Row: {
          id: string
          user_id: string
          ingredient: string
          unit: string
          par_level: number
          on_hand: number
          cost_per_unit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ingredient: string
          unit: string
          par_level: number
          on_hand: number
          cost_per_unit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ingredient?: string
          unit?: string
          par_level?: number
          on_hand?: number
          cost_per_unit?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      weekly_goals: {
        Row: {
          id: string
          user_id: string
          revenue: number
          week_start: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          revenue: number
          week_start: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          revenue?: number
          week_start?: string
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          user_id: string
          name: string
          role: string
          hourly_rate: number
          availability: Json
          max_hours: number
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          role: string
          hourly_rate: number
          availability: Json
          max_hours: number
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          role?: string
          hourly_rate?: number
          availability?: Json
          max_hours?: number
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      day_tag: DayTag
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
