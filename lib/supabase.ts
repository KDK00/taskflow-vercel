import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yutvzerxfihgqcnuzmuz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dHZ6ZXJ4ZmloZ3FjbnV6bXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjI0NzQsImV4cCI6MjA2NTgzODQ3NH0.GMn4d_eCzAPFvJw2jAFd18TSynEuP7YVMYLjeozfAp4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          password: string
          email: string
          role: 'employee' | 'manager' | 'developer'
          name: string
          department: string | null
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          email: string
          role?: 'employee' | 'manager' | 'developer'
          name: string
          department?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          email?: string
          role?: 'employee' | 'manager' | 'developer'
          name?: string
          department?: string | null
          created_at?: string
        }
      }
      daily_tasks: {
        Row: {
          id: number
          title: string
          description: string | null
          assignee: string
          priority: 'high' | 'medium' | 'low'
          status: 'pending' | 'in_progress' | 'completed' | 'on_hold'
          due_date: string
          created_at: string
          updated_at: string
          created_by: string
          estimated_hours: number | null
          actual_hours: number | null
          category: string | null
          tags: string | null
          follow_up_assignee: string | null
          is_follow_up_task: boolean
          parent_task_id: number | null
          follow_up_status: 'pending' | 'approved' | 'rejected' | null
          follow_up_notes: string | null
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          assignee: string
          priority?: 'high' | 'medium' | 'low'
          status?: 'pending' | 'in_progress' | 'completed' | 'on_hold'
          due_date: string
          created_at?: string
          updated_at?: string
          created_by: string
          estimated_hours?: number | null
          actual_hours?: number | null
          category?: string | null
          tags?: string | null
          follow_up_assignee?: string | null
          is_follow_up_task?: boolean
          parent_task_id?: number | null
          follow_up_status?: 'pending' | 'approved' | 'rejected' | null
          follow_up_notes?: string | null
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          assignee?: string
          priority?: 'high' | 'medium' | 'low'
          status?: 'pending' | 'in_progress' | 'completed' | 'on_hold'
          due_date?: string
          created_at?: string
          updated_at?: string
          created_by?: string
          estimated_hours?: number | null
          actual_hours?: number | null
          category?: string | null
          tags?: string | null
          follow_up_assignee?: string | null
          is_follow_up_task?: boolean
          parent_task_id?: number | null
          follow_up_status?: 'pending' | 'approved' | 'rejected' | null
          follow_up_notes?: string | null
        }
      }
      // Add other table types as needed
    }
  }
} 