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

    // Check cooldown (1 hour)
    const lastRain = await prisma.setting.findUnique({
      where: { key: 'last_gem_rain' }
    })

    if (lastRain) {
      const lastRainTime = new Date(lastRain.value as string)
      const now = new Date()
      const hoursSinceLastRain = (now.getTime() - lastRainTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastRain < 1) {
        return NextResponse.json({ 
          error: `Cooldown active. Try again in ${Math.ceil(1 - hoursSinceLastRain)} hours.` 
        }, { status: 429 })
      }
    }

    // Get all users with active sessions (online users)
    const activeSessions = await prisma.session.findMany({
      where: {
        expires: { gt: new Date() }
      },
      include: { user: true }
    })

    const onlineUserIds = [...new Set(activeSessions.map(s => s.user_id))]

    // Give 10 gems to each online user
    await prisma.user.updateMany({
      where: { user_id: { in: onlineUserIds } },
      data: { gems: { increment: BigInt(10) } }
    })

    // Update cooldown
    await prisma.setting.upsert({
      where: { key: 'last_gem_rain' },
      update: { value: new Date().toISOString() },
      create: { key: 'last_gem_rain', value: new Date().toISOString() }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: user.user_id,
        action: 'GEM_RAIN',
        details: { users_count: onlineUserIds.length, gems_per_user: 10 }
      }
    })

    return NextResponse.json({ 
      success: true, 
      users_affected: onlineUserIds.length 
    })

  } catch (error) {
    console.error('Failed to send gem rain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}