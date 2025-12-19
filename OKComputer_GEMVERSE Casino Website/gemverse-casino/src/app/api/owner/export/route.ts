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

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Get all data
    const [
      users,
      bets,
      games,
      settings,
      adminLogs,
      reports,
      sessions
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          user_id: true,
          username: true,
          email: true,
          role: true,
          gems: true,
          crystals: true,
          level: true,
          xp: true,
          created_at: true,
          last_active: true,
          is_banned: true,
          mute_until: true,
          referred_by_id: true
        }
      }),
      prisma.bet.findMany({
        select: {
          bet_id: true,
          user_id: true,
          game: true,
          amount: true,
          outcome: true,
          profit: true,
          created_at: true
        }
      }),
      prisma.game.findMany(),
      prisma.setting.findMany(),
      prisma.adminLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 1000
      }),
      prisma.report.findMany(),
      prisma.session.findMany({
        where: { expires: { gt: new Date() } }
      })
    ])

    // Convert BigInt to string for JSON serialization
    const processedData = {
      export_metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        format: format,
        exported_by: user.username,
        total_records: users.length + bets.length + games.length + settings.length + adminLogs.length + reports.length + sessions.length
      },
      users: users.map(user => ({
        ...user,
        gems: user.gems.toString(),
        crystals: user.crystals.toString(),
        xp: user.xp.toString()
      })),
      bets: bets.map(bet => ({
        ...bet,
        amount: bet.amount.toString(),
        profit: bet.profit.toString()
      })),
      games,
      settings,
      admin_logs: adminLogs.map(log => ({
        ...log,
        details: log.details
      })),
      reports,
      active_sessions: sessions.length
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `gemverse-export-${timestamp}`

    switch (format) {
      case 'json':
        return createJsonExport(processedData, filename)
      case 'csv':
        return createCsvExport(processedData, filename)
      case 'sql':
        return createSqlExport(processedData, filename)
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function createJsonExport(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  
  const response = new NextResponse(blob)
  response.headers.set('Content-Disposition', `attachment; filename="${filename}.json"`)
  response.headers.set('Content-Type', 'application/json')
  
  return response
}

function createCsvExport(data: any, filename: string) {
  const csvContent = convertToCsv(data)
  const blob = new Blob([csvContent], { type: 'text/csv' })
  
  const response = new NextResponse(blob)
  response.headers.set('Content-Disposition', `attachment; filename="${filename}.csv"`)
  response.headers.set('Content-Type', 'text/csv')
  
  return response
}

function createSqlExport(data: any, filename: string) {
  const sqlContent = generateSqlInserts(data)
  const blob = new Blob([sqlContent], { type: 'text/sql' })
  
  const response = new NextResponse(blob)
  response.headers.set('Content-Disposition', `attachment; filename="${filename}.sql"`)
  response.headers.set('Content-Type', 'text/sql')
  
  return response
}

function convertToCsv(data: any): string {
  let csv = ''
  
  // Add metadata as comments
  csv += `# Gemverse Casino Export\n`
  csv += `# Timestamp: ${data.export_metadata.timestamp}\n`
  csv += `# Version: ${data.export_metadata.version}\n`
  csv += `# Exported by: ${data.export_metadata.exported_by}\n\n`

  // Users table
  csv += 'USERS\n'
  csv += 'user_id,username,email,role,gems,crystals,level,xp,created_at,last_active,is_banned\n'
  for (const user of data.users) {
    csv += `${user.user_id},"${user.username}","${user.email || ''}","${user.role}",${user.gems},${user.crystals},${user.level},${user.xp},"${user.created_at}","${user.last_active}",${user.is_banned}\n`
  }

  csv += '\nBETS\n'
  csv += 'bet_id,user_id,game,amount,profit,created_at\n'
  for (const bet of data.bets) {
    csv += `"${bet.bet_id}",${bet.user_id},"${bet.game}",${bet.amount},${bet.profit},"${bet.created_at}"\n`
  }

  return csv
}

function generateSqlInserts(data: any): string {
  let sql = ''
  
  sql += `-- Gemverse Casino Database Export\n`
  sql += `-- Timestamp: ${data.export_metadata.timestamp}\n`
  sql += `-- Version: ${data.export_metadata.version}\n`
  sql += `-- Exported by: ${data.export_metadata.exported_by}\n\n`

  sql += `-- Users\n`
  sql += `TRUNCATE TABLE users CASCADE;\n`
  for (const user of data.users) {
    sql += `INSERT INTO users (user_id, username, email, role, gems, crystals, level, xp, created_at, last_active, is_banned) VALUES\n`
    sql += `(${user.user_id}, '${user.username}', ${user.email ? `'${user.email}'` : 'NULL'}, '${user.role}', ${user.gems}, ${user.crystals}, ${user.level}, ${user.xp}, '${user.created_at}', '${user.last_active}', ${user.is_banned});\n`
  }

  sql += `\n-- Settings\n`
  sql += `TRUNCATE TABLE settings;\n`
  for (const setting of data.settings) {
    sql += `INSERT INTO settings (key, value, updated_at) VALUES\n`
    sql += `('${setting.key}', '${JSON.stringify(setting.value).replace(/'/g, "''")}', '${setting.updated_at}');\n`
  }

  sql += `\n-- Admin Logs\n`
  for (const log of data.admin_logs) {
    sql += `INSERT INTO admin_logs (log_id, admin_id, action, target_id, details, created_at) VALUES\n`
    sql += `(${log.log_id}, ${log.admin_id}, '${log.action}', ${log.target_id || 'NULL'}, '${JSON.stringify(log.details).replace(/'/g, "''")}', '${log.created_at}');\n`
  }

  return sql
}