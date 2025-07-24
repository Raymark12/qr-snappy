import bcrypt from 'bcrypt'
import { AUTH } from '@/lib/constants'

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, AUTH.SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return await bcrypt.compare(password, storedHash)
}

