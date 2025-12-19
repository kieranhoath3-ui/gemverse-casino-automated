import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Verify owner session
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

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner privileges required' }, { status: 403 })
    }

    const { message } = await request.json()

    if (!message || message.length > 500) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // In a real implementation, this would broadcast via WebSocket
    // For now, we'll just log it
    console.log(`BROADCAST from ${user.username}: ${message}`)

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: user.user_id,
        action: 'BROADCAST_MESSAGE',
        details: { message }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to broadcast message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}