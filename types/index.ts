import type { Database } from './database'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Base database types
export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

export type EventBase = Tables<'events'>
export type EventInsert = TablesInsert<'events'> & {
  auto_approve?: boolean
}
export type EventUpdate = TablesUpdate<'events'> & {
  auto_approve?: boolean
}

export type Event = EventBase & {
  auto_approve: boolean
}

export type EventAssignment = Tables<'event_assignments'>
export type EventAssignmentInsert = TablesInsert<'event_assignments'>
export type EventAssignmentUpdate = TablesUpdate<'event_assignments'>

export type Photo = Tables<'photos'>
export type PhotoInsert = TablesInsert<'photos'>
export type PhotoUpdate = TablesUpdate<'photos'>

export type EventWithDetails = Event & {
  profiles: Pick<Profile, 'email'>
  photos?: Photo[]
  _count?: {
    photos: number
    approved_photos: number
    pending_photos: number
  }
}

export type EventAssignmentWithDetails = EventAssignment & {
  events: Pick<Event, 'title' | 'description' | 'is_active'>
  client: Pick<Profile, 'email'>
  assigned_by_profile: Pick<Profile, 'email'>
}

export type PhotoWithEvent = Photo & {
  events: Pick<Event, 'title' | 'admin_id'>
}

export type UserRole = 'admin' | 'user' | 'client'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
}