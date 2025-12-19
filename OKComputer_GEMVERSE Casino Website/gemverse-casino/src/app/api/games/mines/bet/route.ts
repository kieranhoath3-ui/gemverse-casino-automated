import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

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

    const { amount, grid_size, mines_count, server_seed, client_nonce } = await request.json()

    // Validate bet
    if (amount < 1 || amount > 100000) {
      return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 })
    }

    if (user.gems < BigInt(amount)) {
      return NextResponse.json({ error: 'Insufficient gems' }, { status: 400 })
    }

    // Deduct gems
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { gems: user.gems - BigInt(amount) }
    })

    // Create bet record
    const bet = await prisma.bet.create({
      data: {
        bet_id: uuidv4(),
        user_id: user.user_id,
        game: 'mines',
        amount: BigInt(amount),
        outcome: {
          grid_size,
          mines_count,
          server_seed,
          client_nonce,
          status: 'active'
        },
        profit: BigInt(-amount)
      }
    })

    return NextResponse.json({
      success: true,
      bet_id: bet.bet_id,
      new_balance: (user.gems - BigInt(amount)).toString()
    })

  } catch (error) {
    console.error('Failed to place mines bet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}