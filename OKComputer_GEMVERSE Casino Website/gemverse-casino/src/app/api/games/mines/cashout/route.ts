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

    const user = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!user || user.is_banned) {
      return NextResponse.json({ error: 'User not found or banned' }, { status: 403 })
    }

    const { bet_id, multiplier, cells_revealed } = await request.json()

    // Find the bet
    const bet = await prisma.bet.findUnique({
      where: { bet_id }
    })

    if (!bet || bet.user_id !== user.user_id) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
    }

    const outcome = bet.outcome as any
    if (outcome.status !== 'active') {
      return NextResponse.json({ error: 'Bet already completed' }, { status: 400 })
    }

    // Calculate winnings
    const winnings = Math.floor(Number(bet.amount) * multiplier)
    const profit = winnings - Number(bet.amount)

    // Update user balance
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { gems: user.gems + BigInt(winnings) }
    })

    // Update bet
    await prisma.bet.update({
      where: { bet_id },
      data: {
        outcome: {
          ...outcome,
          status: 'won',
          multiplier,
          cells_revealed
        },
        profit: BigInt(profit)
      }
    })

    return NextResponse.json({
      success: true,
      winnings,
      new_balance: (user.gems + BigInt(winnings)).toString()
    })

  } catch (error) {
    console.error('Failed to cash out mines bet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}