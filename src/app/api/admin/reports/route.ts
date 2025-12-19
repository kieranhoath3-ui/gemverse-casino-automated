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

    // Get reports with user information
    const reports = await prisma.report.findMany({
      include: {
        reporter: {
          select: { username: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Get target usernames
    const targetIds = reports.map(r => r.target_id)
    const targetUsers = await prisma.user.findMany({
      where: { user_id: { in: targetIds } },
      select: { user_id: true, username: true }
    })

    const targetUserMap = new Map(targetUsers.map(u => [u.user_id, u.username]))

    return NextResponse.json({
      reports: reports.map(report => ({
        ...report,
        reporter_username: report.reporter.username,
        target_username: targetUserMap.get(report.target_id) || 'Unknown'
      }))
    })

  } catch (error) {
    console.error('Failed to get reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}