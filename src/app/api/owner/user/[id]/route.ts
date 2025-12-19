import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const owner = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!owner || owner.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner privileges required' }, { status: 403 })
    }

    const userId = parseInt(params.id)
    const body = await request.json()

    // Prevent modifying owner account
    const targetUser = await prisma.user.findUnique({
      where: { user_id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'OWNER' && owner.user_id !== targetUser.user_id) {
      return NextResponse.json({ error: 'Cannot modify owner account' }, { status: 403 })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: body
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: owner.user_id,
        action: 'UPDATE_USER',
        target_id: userId,
        details: body
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}