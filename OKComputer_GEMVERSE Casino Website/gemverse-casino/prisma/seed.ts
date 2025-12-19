import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ownerManager } from '@/lib/owner'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Initializing Gemverse Casino system...')
  
  // Check if system is already initialized
  const isInitialized = await ownerManager.initializeSystem()
  
  if (!isInitialized) {
    console.log('⚠️  System already initialized')
    return
  }

  console.log('✅ System initialized successfully')
  console.log('🎯 Creating OWNER account (first user)...')

  // Generate secure password for owner
  const ownerPassword = generateSecurePassword()
  const hashedPassword = await bcrypt.hash(ownerPassword, 12)
  
  // Create OWNER user with enhanced privileges
  const owner = await prisma.user.create({
    data: {
      username: generateOwnerUsername(),
      password_hash: hashedPassword,
      email: `owner@${generateRandomString(8)}.casino`,
      role: 'OWNER',
      gems: BigInt(1000000), // 1M gems
      crystals: BigInt(10000), // 10K crystals
      level: 100,
      xp: BigInt(100000),
      created_at: new Date(),
      last_active: new Date()
    }
  })

  console.log(`👑 OWNER created successfully:`)
  console.log(`   Username: ${owner.username}`)
  console.log(`   Password: ${ownerPassword}`)
  console.log(`   User ID: ${owner.user_id}`)

  // Create default games with optimized settings
  console.log('🎮 Creating default games...')
  const games = [
    { 
      name: 'mines', 
      enabled: true, 
      rtp: 97.5, 
      max_bet: BigInt(100000),
      owner_params: {
        grid_sizes: [3, 4, 5, 6, 7, 8],
        default_grid_size: 5,
        max_mines: 24,
        default_mines: 5,
        multiplier_formula: '1 / (1 - (mines / tiles))'
      }
    },
    { 
      name: 'plinko', 
      enabled: true, 
      rtp: 96.8, 
      max_bet: BigInt(100000),
      owner_params: {
        rows: [8, 9, 10, 11, 12, 13, 14, 15, 16],
        default_rows: 12,
        risk_levels: ['low', 'medium', 'high'],
        default_risk: 'medium'
      }
    },
    { 
      name: 'crash', 
      enabled: true, 
      rtp: 98.2, 
      max_bet: BigInt(100000),
      owner_params: {
        curve_formula: 'e^(t/10)',
        moon_mode_formula: 'e^(t/5)',
        max_multiplier: 1000,
        min_multiplier: 1.01,
        house_edge: 1.8
      }
    }
  ]

  for (const game of games) {
    await prisma.game.create({
      data: game
    })
  }

  console.log('✅ Games created successfully')

  // Create comprehensive system settings
  console.log('⚙️  Creating system settings...')
  const settings = [
    // Economy settings
    { key: 'daily_faucet', value: { amount: 100, cooldown_hours: 24, enabled: true } },
    { key: 'level_up_reward', value: { multiplier: 50, base_gems: 500, enabled: true } },
    { key: 'ad_doubler', value: { enabled: true, multiplier: 2, cooldown_minutes: 30 } },
    { key: 'tournament_house_cut', value: { percentage: 1, min_participants: 10 } },
    { key: 'global_tax', value: { percentage: 2, threshold: 10000, enabled: true } },
    { key: 'gem_to_xp', value: { rate: 1, burn_enabled: true } },
    
    // Game settings
    { key: 'mines_config', value: { 
      grid_sizes: [3, 4, 5, 6, 7, 8],
      default_grid_size: 5,
      max_mines: 24,
      default_mines: 5,
      max_bet: 100000
    }},
    { key: 'plinko_config', value: { 
      rows: [8, 9, 10, 11, 12, 13, 14, 15, 16],
      default_rows: 12,
      risk_levels: ['low', 'medium', 'high'],
      default_risk: 'medium',
      max_bet: 100000
    }},
    { key: 'crash_config', value: { 
      max_multiplier: 1000,
      min_multiplier: 1.01,
      house_edge: 1.8,
      max_bet: 100000,
      round_duration_min: 5,
      round_duration_max: 30
    }},
    
    // System settings
    { key: 'owner_preferences', value: {
      theme: 'dark',
      notifications: true,
      privacy_mode: false,
      two_factor_enabled: false,
      dashboard_refresh: 30000
    }},
    { key: 'security_settings', value: {
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
      session_timeout_hours: 24,
      ip_whitelist_enabled: false
    }},
    { key: 'rate_limits', value: {
      api_calls_per_minute: 60,
      bets_per_minute: 10,
      transfers_per_hour: 20
    }}
  ]

  for (const setting of settings) {
    await prisma.setting.create({
      data: setting
    })
  }

  console.log('✅ Settings created successfully')

  // Create sample admin account for testing
  console.log('🛡️  Creating sample admin account...')
  const adminPassword = generateSecurePassword()
  const adminHashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password_hash: adminHashedPassword,
      email: `admin@${generateRandomString(8)}.casino`,
      role: 'ADMIN',
      gems: BigInt(50000),
      crystals: BigInt(1000),
      level: 50,
      xp: BigInt(25000)
    }
  })

  console.log(`🛡️  ADMIN created successfully:`)
  console.log(`   Username: admin`)
  console.log(`   Password: ${adminPassword}`)

  // Create sample players for testing
  console.log('👥 Creating sample players...')
  const samplePlayers = [
    { username: 'player1', gems: 5000, level: 10 },
    { username: 'player2', gems: 7500, level: 15 },
    { username: 'player3', gems: 3200, level: 8 }
  ]

  for (const player of samplePlayers) {
    const playerPassword = generateSecurePassword()
    const playerHashedPassword = await bcrypt.hash(playerPassword, 12)
    
    await prisma.user.create({
      data: {
        username: player.username,
        password_hash: playerHashedPassword,
        role: 'PLAYER',
        gems: BigInt(player.gems),
        crystals: BigInt(0),
        level: player.level,
        xp: BigInt(player.level * 1000)
      }
    })

    console.log(`👤 PLAYER ${player.username} created`)
  }

  // Create sample bets for analytics
  console.log('🎲 Creating sample bets...')
  const sampleBets = [
    { game: 'mines', amount: 100, profit: 50 },
    { game: 'plinko', amount: 200, profit: -100 },
    { game: 'crash', amount: 150, profit: 75 }
  ]

  for (const bet of sampleBets) {
    await prisma.bet.create({
      data: {
        bet_id: crypto.randomUUID(),
        user_id: admin.user_id, // Use admin as sample player
        game: bet.game,
        amount: BigInt(bet.amount),
        outcome: { result: bet.profit > 0 ? 'win' : 'loss', multiplier: Math.abs(bet.profit) / bet.amount },
        profit: BigInt(bet.profit)
      }
    })
  }

  console.log('✅ Sample data created successfully')
  console.log('')
  console.log('🎉 GEMVERSE CASINO SYSTEM READY!')
  console.log('=====================================')
  console.log('')
  console.log('📋 DEFAULT ACCOUNTS:')
  console.log('   Owner Login: (First registered user becomes owner)')
  console.log('   Admin Login: username: "admin", password: see above')
  console.log('')
  console.log('🚀 NEXT STEPS:')
  console.log('   1. npm run dev')
  console.log('   2. Register first account to become OWNER')
  console.log('   3. Access /owner for owner dashboard')
  console.log('   4. Access /admin for admin dashboard')
  console.log('')
  console.log('📚 DOCUMENTATION:')
  console.log('   README.md - Complete system documentation')
  console.log('   DEPLOYMENT.md - Production deployment guide')
}

// Helper functions
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

function generateOwnerUsername(): string {
  const prefixes = ['Master', 'Supreme', 'Ultimate', 'Divine', 'Eternal']
  const suffixes = ['Oracle', 'Sovereign', 'Monarch', 'Ruler', 'Authority']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  return `${prefix}${suffix}`.toLowerCase()
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })