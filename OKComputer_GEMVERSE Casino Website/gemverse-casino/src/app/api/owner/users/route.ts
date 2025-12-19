import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
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

    // Get all users
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        gems: user.gems.toString(),
        crystals: user.crystals.toString(),
        xp: user.xp.toString()
      }))
    })

  } catch (error) {
    console.error('Failed to get users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}