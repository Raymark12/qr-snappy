'use server'

import { getAuthenticatedImageUrl } from '@/lib/utils/storage'

export async function getImageUrl(filePath: string, options?: { publicMode?: boolean; eventId?: string }) {
  return getAuthenticatedImageUrl(filePath, options)
}
