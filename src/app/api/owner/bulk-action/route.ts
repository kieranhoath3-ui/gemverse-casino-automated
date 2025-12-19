import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PermissionManager } from '@/lib/permission'

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

    const actor = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!actor || actor.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner privileges required' }, { status: 403 })
    }

    const { action, user_ids } = await request.json()

    // Validate input
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 })
    }

    if (!['ban', 'unban', 'promote', 'demote'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get target users
    const targetUsers = await prisma.user.findMany({
      where: { user_id: { in: user_ids } }
    })

    // Validate permissions for each target
    const validTargets: number[] = []
    const invalidTargets: { user_id: number; reason: string }[] = []

    for (const targetUser of targetUsers) {
      // Check if action is allowed on this user
      if (targetUser.role === 'OWNER') {
        invalidTargets.push({ 
          user_id: targetUser.user_id, 
          reason: 'Cannot modify owner account' 
        })
        continue
      }

      // Validate role transitions
      if (action === 'promote' || action === 'demote') {
        const targetRole = action === 'promote' ? 'ADMIN' : 'PLAYER'
        const validation = PermissionManager.validatePermissionTransition(
          targetUser.role,
          targetRole,
          actor.role
        )

        if (!validation.valid) {
          invalidTargets.push({ 
            user_id: targetUser.user_id, 
            reason: validation.reason || 'Permission denied' 
          })
          continue
        }
      }

      validTargets.push(targetUser.user_id)
    }

    // Perform bulk action
    const results = await prisma.$transaction(async (tx) => {
      const updates = []

      for (const userId of validTargets) {
        let updateData: any = {}

        switch (action) {
          case 'ban':
            updateData = { is_banned: true }
            break
          case 'unban':
            updateData = { is_banned: false }
            break
          case 'promote':
            updateData = { role: 'ADMIN' }
            break
          case 'demote':
            updateData = { role: 'PLAYER' }
            break
        }

        const update = tx.user.update({
          where: { user_id: userId },
          data: updateData
        })

        updates.push(update)

        // Log the action
        await tx.adminLog.create({
          data: {
            admin_id: actor.user_id,
            action: `BULK_${action.toUpperCase()}`,
            target_id: userId,
            details: {
              bulk_action: true,
              action_type: action,
              target_count: validTargets.length,
              timestamp: new Date().toISOString()
            }
          }
        })

        // If banning, also delete sessions
        if (action === 'ban') {
          await tx.session.deleteMany({
            where: { user_id: userId }
          })
        }
      }

      return await Promise.all(updates)
    })

    return NextResponse.json({
      success: true,
      processed: results.length,
      valid_targets: validTargets.length,
      invalid_targets: invalidTargets,
      action: action
    })

  } catch (error) {
    console.error('Bulk action failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}