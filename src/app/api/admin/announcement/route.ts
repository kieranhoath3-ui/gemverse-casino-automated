import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Verify admin/owner session
    const sessionToken = request.cookies.get('session-token')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken }
    })

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
    }

    const { message } = await request.json()

    if (!message || message.length > 120) {
      return NextResponse.json({ error: 'Message too long (max 120 characters)' }, { status: 400 })
    }

    // In a real implementation, this would set a global announcement
    // For now, we'll just log it
    console.log(`ANNOUNCEMENT from ${user.username}: ${message}`)

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: user.user_id,
        action: 'POST_ANNOUNCEMENT',
        details: { message }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to post announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}