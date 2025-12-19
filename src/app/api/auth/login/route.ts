import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if banned
    if (user.is_banned) {
      return NextResponse.json(
        { success: false, error: 'Account has been banned' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last active
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_active: new Date() }
    })

    // Create session
    const sessionToken = uuidv4()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.session.create({
      data: {
        session_token: sessionToken,
        user_id: user.user_id,
        expires
      }
    })

    // Return user data without password
    const { password_hash: _, ...userWithoutPassword } = user
    
    const response = NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        gems: userWithoutPassword.gems.toString(),
        crystals: userWithoutPassword.crystals.toString(),
        xp: userWithoutPassword.xp.toString()
      }
    })

    // Set session cookie
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}