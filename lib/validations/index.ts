import { z } from 'zod'
import { AUTH } from '@/lib/constants'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(AUTH.MIN_USER_PASSWORD_LENGTH, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  autoApprove: z.boolean().optional().default(false),
})

export type CreateEventInput = z.infer<typeof createEventSchema>

export const verifyPasswordSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  password: z.string().min(1, 'Password is required'),
})

export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
})

export type EventIdParam = z.infer<typeof eventIdParamSchema>

export const photoIdParamSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  photoId: z.string().uuid('Invalid photo ID'),
})

export type PhotoIdParam = z.infer<typeof photoIdParamSchema>