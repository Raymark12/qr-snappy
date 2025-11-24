// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

export function validateUserId(userId: string): boolean {
  return isValidUUID(userId)
}

export function validateEventId(eventId: string): boolean {
  return isValidUUID(eventId)
}

