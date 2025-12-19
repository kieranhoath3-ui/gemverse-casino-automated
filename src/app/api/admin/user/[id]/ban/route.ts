import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const admin = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
    }

    const userId = parseInt(params.id)

    // Check if trying to ban owner or admin (only owner can ban admins)
    const targetUser = await prisma.user.findUnique({
      where: { user_id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot ban owner' }, { status: 403 })
    }

    if (targetUser.role === 'ADMIN' && admin.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can ban admins' }, { status: 403 })
    }

    // Ban user
    await prisma.user.update({
      where: { user_id: userId },
      data: { is_banned: true }
    })

    // Delete all user sessions
    await prisma.session.deleteMany({
      where: { user_id: userId }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: admin.user_id,
        action: 'BAN_USER',
        target_id: userId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to ban user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}