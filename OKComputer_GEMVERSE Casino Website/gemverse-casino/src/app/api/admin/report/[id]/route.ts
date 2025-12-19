import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const reportId = parseInt(params.id)
    const { status } = await request.json()

    // Update report
    await prisma.report.update({
      where: { report_id: reportId },
      data: { status }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: user.user_id,
        action: 'UPDATE_REPORT',
        target_id: reportId,
        details: { status }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to update report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}