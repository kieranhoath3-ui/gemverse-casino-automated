import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
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

    const fromUser = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!fromUser || fromUser.is_banned) {
      return NextResponse.json({ error: 'User not found or banned' }, { status: 403 })
    }

    const { to_username, amount } = await request.json()

    // Find recipient
    const toUser = await prisma.user.findUnique({
      where: { username: to_username }
    })

    if (!toUser) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    if (fromUser.user_id === toUser.user_id) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 })
    }

    if (fromUser.gems < BigInt(amount)) {
      return NextResponse.json({ error: 'Insufficient gems' }, { status: 400 })
    }

    // Calculate tax (5%)
    const tax = Math.floor(amount * 0.05)
    const amountAfterTax = amount - tax

    // Transfer gems
    await prisma.$transaction([
      prisma.user.update({
        where: { user_id: fromUser.user_id },
        data: { gems: fromUser.gems - BigInt(amount) }
      }),
      prisma.user.update({
        where: { user_id: toUser.user_id },
        data: { gems: toUser.gems + BigInt(amountAfterTax) }
      })
    ])

    return NextResponse.json({
      success: true,
      amount_sent: amountAfterTax,
      tax_collected: tax,
      new_balance: (fromUser.gems - BigInt(amount)).toString()
    })

  } catch (error) {
    console.error('Failed to transfer gems:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}