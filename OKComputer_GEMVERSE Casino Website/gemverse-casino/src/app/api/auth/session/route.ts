import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    // Find session
    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken }
    })

    if (!session || session.expires < new Date()) {
      // Delete expired session
      if (session) {
        await prisma.session.delete({
          where: { session_token: sessionToken }
        })
      }
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!user || user.is_banned) {
      return NextResponse.json({ error: 'User not found or banned' }, { status: 401 })
    }

    // Update last active
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_active: new Date() }
    })

    // Return user data without password
    const { password_hash: _, ...userWithoutPassword } = user
    
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        gems: userWithoutPassword.gems.toString(),
        crystals: userWithoutPassword.crystals.toString(),
        xp: userWithoutPassword.xp.toString()
      }
    })

  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}