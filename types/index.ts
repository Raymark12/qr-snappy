import type { Database } from './database'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type Profile = Tables<'profiles'>
export type Event = Tables<'events'>
export type EventAssignment = Tables<'event_assignments'>
export type Photo = Tables<'photos'>

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
