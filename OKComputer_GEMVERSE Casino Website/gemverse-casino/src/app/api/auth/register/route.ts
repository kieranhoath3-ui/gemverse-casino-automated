import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { ownerManager, OWNER_CONFIG } from '@/lib/owner'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, referral_code } = await request.json()

    // Enhanced validation
    const validationResult = await validateRegistrationInput(username, password, email)
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 400 }
      )
    }

    // Check if system is initialized
    const isSystemInitialized = await checkSystemInitialization()
    
    // Determine if this will be the owner
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0
    const userRole = isFirstUser ? 'OWNER' : 'PLAYER'

    // Hash password with enhanced security
    const password_hash = await bcrypt.hash(password, 12)

    // Calculate starting bonuses
    const startingStats = calculateStartingStats(isFirstUser, referral_code)

    // Create user with atomic transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          username: username.toLowerCase(), // Case-insensitive usernames
          password_hash,
          email: email?.toLowerCase(),
          role: userRole,
          gems: startingStats.gems,
          crystals: startingStats.crystals,
          level: startingStats.level,
          xp: BigInt(0),
          created_at: new Date(),
          last_active: new Date()
        }
      })

      // Handle referral system
      if (referral_code) {
        await processReferral(tx, newUser.user_id, referral_code)
      }

      // Initialize owner-specific settings if this is the owner
      if (isFirstUser) {
        await initializeOwnerSettings(tx, newUser.user_id)
      }

      // Log user creation
      await tx.adminLog.create({
        data: {
          admin_id: newUser.user_id,
          action: 'USER_REGISTERED',
          target_id: newUser.user_id,
          details: {
            username: newUser.username,
            role: newUser.role,
            is_first_user: isFirstUser,
            referral_code: referral_code || null,
            ip: request.ip || 'unknown'
          }
        }
      })

      return newUser
    })

    // Create secure session
    const sessionData = await createSecureSession(user.user_id)

    // Prepare response
    const response = createSuccessResponse(user, sessionData)

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function validateRegistrationInput(username: string, password: string, email?: string) {
  // Username validation
  if (!username || username.length < 3 || username.length > 30) {
    return { valid: false, error: 'Username must be 3-30 characters long' }
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
  }

  // Password validation
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' }
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password too long' }
  }

  // Check password complexity
  const hasNumber = /\d/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  if (!hasNumber || !hasLowercase || !hasUppercase) {
    return { 
      valid: false, 
      error: 'Password must contain at least one number, one lowercase, and one uppercase letter' 
    }
  }

  // Email validation (if provided)
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' }
    }
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'system', 'owner', 'moderator',
    'gemverse', 'casino', 'support', 'help', 'info', 'test', 'guest'
  ]

  if (reservedUsernames.includes(username.toLowerCase())) {
    return { valid: false, error: 'Username is reserved' }
  }

  // Check if username already exists (case-insensitive)
  const existingUser = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive'
      }
    }
  })

  if (existingUser) {
    return { valid: false, error: 'Username already taken' }
  }

  return { valid: true }
}

async function checkSystemInitialization(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'system_initialized' }
  })

  return setting?.value?.value === true
}

function calculateStartingStats(isFirstUser: boolean, referralCode?: string) {
  let gems = BigInt(1000)
  let crystals = BigInt(0)
  let level = 1

  if (isFirstUser) {
    // First user becomes OWNER with enhanced starting stats
    gems = OWNER_CONFIG.initialGems
    crystals = OWNER_CONFIG.initialCrystals
    level = OWNER_CONFIG.initialLevel
  }

  if (referralCode) {
    // Referral bonus
    gems += BigInt(100)
  }

  return { gems, crystals, level }
}

async function processReferral(tx: any, newUserId: number, referralCode: string) {
  const referrer = await tx.user.findFirst({
    where: { 
      username: {
        equals: referralCode,
        mode: 'insensitive'
      }
    }
  })
  
  if (referrer) {
    // Set referral relationship
    await tx.user.update({
      where: { user_id: newUserId },
      data: { referred_by_id: referrer.user_id }
    })
    
    // Give referral bonus to referrer
    await tx.user.update({
      where: { user_id: referrer.user_id },
      data: { gems: referrer.gems + BigInt(100) }
    })

    // Log referral
    await tx.adminLog.create({
      data: {
        admin_id: newUserId,
        action: 'REFERRAL_COMPLETED',
        target_id: referrer.user_id,
        details: {
          referrer_username: referrer.username,
          bonus_gems: 100
        }
      }
    })
  }
}

async function initializeOwnerSettings(tx: any, ownerId: number) {
  // Initialize system-wide owner preferences
  const ownerSettings = [
    {
      key: 'owner_preferences',
      value: {
        theme: 'dark',
        notifications: true,
        privacy_mode: false,
        two_factor_enabled: false
      }
    },
    {
      key: 'owner_dashboard_config',
      value: {
        refresh_interval: 30000, // 30 seconds
        max_users_per_page: 50,
        default_timezone: 'UTC'
      }
    }
  ]

  for (const setting of ownerSettings) {
    await tx.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value }
    })
  }
}

async function createSecureSession(userId: number) {
  const sessionToken = uuidv4()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const session = await prisma.session.create({
    data: {
      session_token: sessionToken,
      user_id: userId,
      expires,
      created_at: new Date()
    }
  })

  return { sessionToken, expires, sessionId: session.id }
}

function createSuccessResponse(user: any, sessionData: any) {
  const { password_hash: _, ...userWithoutPassword } = user
  
  const response = NextResponse.json({
    success: true,
    user: {
      ...userWithoutPassword,
      gems: userWithoutPassword.gems.toString(),
      crystals: userWithoutPassword.crystals.toString(),
      xp: userWithoutPassword.xp.toString()
    },
    is_owner: user.role === 'OWNER',
    metadata: {
      session_id: sessionData.sessionId,
      expires_at: sessionData.expires.toISOString()
    }
  })

  // Set secure session cookie
  response.cookies.set('session-token', sessionData.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: sessionData.expires,
    path: '/',
    maxAge: 24 * 60 * 60 // 24 hours in seconds
  })

  return response
}