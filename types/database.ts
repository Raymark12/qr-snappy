export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          role: 'admin' | 'user' | 'client'
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role?: 'admin' | 'user' | 'client'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'admin' | 'user' | 'client'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          password: string
          admin_id: string
          is_active: boolean
          background_image_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          password: string
          admin_id: string
          is_active?: boolean
          background_image_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          password?: string
          admin_id?: string
          is_active?: boolean
          background_image_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_assignments: {
        Row: {
          id: string
          event_id: string
          client_id: string
          assigned_by: string
          assigned_at: string
        }
        Insert: {
          id?: string
          event_id: string
          client_id: string
          assigned_by: string
          assigned_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          client_id?: string
          assigned_by?: string
          assigned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignments_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      photos: {
        Row: {
          id: string
          event_id: string
          user_email: string | null
          file_path: string
          file_name: string
          author: string | null
          comment: string | null
          status: 'pending' | 'approved'
          uploaded_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_email?: string | null
          file_path: string
          file_name: string
          author?: string | null
          comment?: string | null
          status?: 'pending' | 'approved'
          uploaded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_email?: string | null
          file_path?: string
          file_name?: string
          author?: string | null
          comment?: string | null
          status?: 'pending' | 'approved'
          uploaded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
