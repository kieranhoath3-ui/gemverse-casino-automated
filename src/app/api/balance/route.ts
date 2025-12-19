import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verify session
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

    if (!user || user.is_banned) {
      return NextResponse.json({ error: 'User not found or banned' }, { status: 403 })
    }

    return NextResponse.json({
      gems: user.gems.toString(),
      crystals: user.crystals.toString(),
      level: user.level,
      xp: user.xp.toString()
    })

  } catch (error) {
    console.error('Failed to get balance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}