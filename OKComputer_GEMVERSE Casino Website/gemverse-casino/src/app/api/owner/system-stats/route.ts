import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { ownerManager } from '@/lib/owner'

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

    // Get comprehensive system statistics
    const [
      userCount,
      activeUsers,
      totalGems,
      totalBets,
      owner,
      recentRegistrations,
      topPlayers,
      systemHealth
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users in last 24 hours
      prisma.user.count({
        where: {
          last_active: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total gems in circulation
      prisma.user.aggregate({
        _sum: { gems: true }
      }),
      
      // Total bets placed
      prisma.bet.count(),
      
      // Owner information
      ownerManager.getOwner(),
      
      // Recent registrations (last 7 days)
      prisma.user.findMany({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: { user_id: true, username: true, created_at: true },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      
      // Top players by gems
      prisma.user.findMany({
        where: { role: 'PLAYER' },
        select: { user_id: true, username: true, gems: true, level: true },
        orderBy: { gems: 'desc' },
        take: 10
      }),
      
      // System health metrics
      prisma.$queryRaw`SELECT 
        COUNT(*) as total_connections,
        MAX(created_at) as last_activity
        FROM sessions WHERE expires > NOW()`
    ])

    // Calculate additional metrics
    const avgGemsPerUser = userCount > 0 ? totalGems._sum.gems / BigInt(userCount) : BigInt(0)
    const registrationGrowth = await calculateRegistrationGrowth()
    const gameStats = await getGameStatistics()

    const stats = {
      total_users: userCount,
      active_users_24h: activeUsers,
      total_gems: totalGems._sum.gems?.toString() || '0',
      avg_gems_per_user: avgGemsPerUser.toString(),
      total_bets: totalBets,
      owner: owner ? {
        user_id: owner.user_id,
        username: owner.username,
        last_active: owner.last_active.toISOString(),
        gems: owner.gems.toString(),
        level: owner.level
      } : null,
      recent_registrations: recentRegistrations,
      top_players: topPlayers.map(p => ({
        user_id: p.user_id,
        username: p.username,
        gems: p.gems.toString(),
        level: p.level
      })),
      registration_growth: registrationGrowth,
      game_statistics: gameStats,
      system_health: {
        active_sessions: systemHealth[0]?.total_connections || 0,
        last_session: systemHealth[0]?.last_activity,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        database_connections: await getDatabaseConnectionCount()
      }
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Failed to get system stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function calculateRegistrationGrowth() {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const previous24h = new Date(last24h.getTime() - 24 * 60 * 60 * 1000)

  const [current, previous] = await Promise.all([
    prisma.user.count({
      where: { created_at: { gte: last24h } }
    }),
    prisma.user.count({
      where: { 
        created_at: { 
          gte: previous24h,
          lt: last24h
        }
      }
    })
  ])

  const growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0

  return {
    current_period: current,
    previous_period: previous,
    growth_rate: growthRate
  }
}

async function getGameStatistics() {
  const [minesBets, plinkoBets, crashBets, totalWagered] = await Promise.all([
    prisma.bet.count({ where: { game: 'mines' } }),
    prisma.bet.count({ where: { game: 'plinko' } }),
    prisma.bet.count({ where: { game: 'crash' } }),
    prisma.bet.aggregate({
      _sum: { amount: true }
    })
  ])

  return {
    mines_bets: minesBets,
    plinko_bets: plinkoBets,
    crash_bets: crashBets,
    total_wagered: totalWagered._sum.amount?.toString() || '0'
  }
}

async function getDatabaseConnectionCount() {
  try {
    const result = await prisma.$queryRaw`
      SELECT count(*) as connections 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `
    return result[0]?.connections || 0
  } catch {
    return 0
  }
}