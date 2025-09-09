import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  return NextResponse.redirect(new URL(`/events/${eventId}/photos`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), 308)
}
