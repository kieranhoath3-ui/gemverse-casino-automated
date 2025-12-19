import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner privileges required' }, { status: 403 })
    }

    // Get all settings
    const settings = await prisma.setting.findMany()
    
    const settingsObject: any = {}
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value
    })

    return NextResponse.json({ settings: settingsObject })

  } catch (error) {
    console.error('Failed to get settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const user = await prisma.user.findUnique({
      where: { user_id: session.user_id }
    })

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner privileges required' }, { status: 403 })
    }

    const settings = await request.json()

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as any, updated_at: new Date() },
        create: { key, value: value as any }
      })
    }

    // Log the action
    await prisma.adminLog.create({
      data: {
        admin_id: user.user_id,
        action: 'UPDATE_SETTINGS',
        details: settings
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}