import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
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

    // In a real implementation, this would fetch from a chat service
    // For now, return mock data
    const mockMessages = [
      { id: 1, username: 'player1', message: 'Great game!', timestamp: new Date().toISOString() },
      { id: 2, username: 'player2', message: 'Love the mines game', timestamp: new Date().toISOString() },
      { id: 3, username: 'player3', message: 'Anyone want to play crash?', timestamp: new Date().toISOString() }
    ]

    return NextResponse.json({
      messages: mockMessages
    })

  } catch (error) {
    console.error('Failed to get chat history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}