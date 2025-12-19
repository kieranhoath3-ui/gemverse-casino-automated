import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface OwnerConfig {
  initialGems: bigint
  initialLevel: number
  initialCrystals: bigint
  permissions: string[]
  isImmutable: boolean
}

export const OWNER_CONFIG: OwnerConfig = {
  initialGems: BigInt(1000000), // 1M gems
  initialLevel: 100,
  initialCrystals: BigInt(10000), // 10K crystals
  permissions: [
    'USER_MANAGEMENT',
    'ECONOMY_CONTROL',
    'GAME_SETTINGS',
    'DATABASE_ACCESS',
    'BROADCAST_MESSAGES',
    'GEM_RAIN',
    'DATA_EXPORT',
    'SYSTEM_MONITORING',
    'ADMIN_ASSIGNMENT',
    'BAN_IMMUNITY'
  ],
  isImmutable: true // Owner cannot be banned or demoted
}

export class OwnerManager {
  private static instance: OwnerManager
  
  static getInstance(): OwnerManager {
    if (!OwnerManager.instance) {
      OwnerManager.instance = new OwnerManager()
    }
    return OwnerManager.instance
  }

  async getOwner(): Promise<any> {
    // Find the owner (first user ever created)
    const owner = await prisma.user.findFirst({
      orderBy: { user_id: 'asc' },
      where: { role: 'OWNER' }
    })

    if (!owner) {
      // No owner exists - system is in setup mode
      return null
    }

    return owner
  }

  async isOwner(userId: number): Promise<boolean> {
    const owner = await this.getOwner()
    return owner?.user_id === userId
  }

  async validateOwnerAction(userId: number, action: string): Promise<boolean> {
    const isOwner = await this.isOwner(userId)
    if (!isOwner) return false

    // Additional validation can be added here
    return true
  }

  async transferOwnership(fromUserId: number, toUserId: number): Promise<boolean> {
    // Only current owner can transfer ownership
    if (!(await this.isOwner(fromUserId))) {
      return false
    }

    // Cannot transfer to self
    if (fromUserId === toUserId) {
      return false
    }

    // Verify target user exists and is not banned
    const targetUser = await prisma.user.findUnique({
      where: { user_id: toUserId }
    })

    if (!targetUser || targetUser.is_banned) {
      return false
    }

    // Perform ownership transfer in transaction
    await prisma.$transaction([
      // Demote current owner to admin
      prisma.user.update({
        where: { user_id: fromUserId },
        data: { role: 'ADMIN' }
      }),
      // Promote target user to owner
      prisma.user.update({
        where: { user_id: toUserId },
        data: { 
          role: 'OWNER',
          gems: targetUser.gems + OWNER_CONFIG.initialGems,
          level: Math.max(targetUser.level, OWNER_CONFIG.initialLevel),
          crystals: targetUser.crystals + OWNER_CONFIG.initialCrystals
        }
      })
    ])

    // Log the ownership transfer
    await prisma.adminLog.create({
      data: {
        admin_id: fromUserId,
        action: 'TRANSFER_OWNERSHIP',
        target_id: toUserId,
        details: {
          previous_owner: fromUserId,
          new_owner: toUserId,
          timestamp: new Date().toISOString()
        }
      }
    })

    return true
  }

  async initializeSystem(): Promise<boolean> {
    // Check if system is already initialized
    const userCount = await prisma.user.count()
    
    if (userCount > 0) {
      // System already initialized
      return false
    }

    // Create system settings
    const systemSettings = [
      { key: 'system_initialized', value: { value: true, timestamp: new Date().toISOString() } },
      { key: 'owner_transfer_enabled', value: { enabled: true, cooldown_hours: 24 } },
      { key: 'system_version', value: { version: '1.0.0', build: Date.now() } },
      { key: 'last_gem_rain', value: null as any },
      { key: 'maintenance_mode', value: { enabled: false, message: '' } }
    ]

    for (const setting of systemSettings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      })
    }

    return true
  }

  async getSystemStats(): Promise<any> {
    const [userCount, owner, totalGems, activeUsers] = await Promise.all([
      prisma.user.count(),
      this.getOwner(),
      prisma.user.aggregate({
        _sum: { gems: true }
      }),
      prisma.user.count({
        where: {
          last_active: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    return {
      total_users: userCount,
      owner: owner ? {
        user_id: owner.user_id,
        username: owner.username,
        last_active: owner.last_active
      } : null,
      total_gems: totalGems._sum.gems?.toString() || '0',
      active_users_24h: activeUsers,
      system_uptime: process.uptime()
    }
  }
}

// Singleton export
export const ownerManager = OwnerManager.getInstance()