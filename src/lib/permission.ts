export enum Permission {
  // User Management
  VIEW_USERS = 'VIEW_USERS',
  EDIT_USERS = 'EDIT_USERS',
  BAN_USERS = 'BAN_USERS',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  
  // Game Management
  VIEW_GAMES = 'VIEW_GAMES',
  EDIT_GAMES = 'EDIT_GAMES',
  TOGGLE_GAMES = 'TOGGLE_GAMES',
  
  // Economy Control
  VIEW_ECONOMY = 'VIEW_ECONOMY',
  EDIT_ECONOMY = 'EDIT_ECONOMY',
  GEM_RAIN = 'GEM_RAIN',
  TRANSFER_GEMS = 'TRANSFER_GEMS',
  
  // Database Access
  RAW_SQL = 'RAW_SQL',
  EXPORT_DATA = 'EXPORT_DATA',
  
  // Communication
  BROADCAST = 'BROADCAST',
  POST_ANNOUNCEMENTS = 'POST_ANNOUNCEMENTS',
  VIEW_REPORTS = 'VIEW_REPORTS',
  HANDLE_REPORTS = 'HANDLE_REPORTS',
  
  // System Control
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  VIEW_LOGS = 'VIEW_LOGS',
  
  // Special Permissions
  OWNER_IMMUNITY = 'OWNER_IMMUNITY',  // Cannot be banned/demoted
  TRANSFER_OWNERSHIP = 'TRANSFER_OWNERSHIP'
}

export const ROLE_PERMISSIONS = {
  OWNER: [
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.BAN_USERS,
    Permission.ASSIGN_ROLES,
    Permission.VIEW_GAMES,
    Permission.EDIT_GAMES,
    Permission.TOGGLE_GAMES,
    Permission.VIEW_ECONOMY,
    Permission.EDIT_ECONOMY,
    Permission.GEM_RAIN,
    Permission.TRANSFER_GEMS,
    Permission.RAW_SQL,
    Permission.EXPORT_DATA,
    Permission.BROADCAST,
    Permission.POST_ANNOUNCEMENTS,
    Permission.VIEW_REPORTS,
    Permission.HANDLE_REPORTS,
    Permission.SYSTEM_SETTINGS,
    Permission.MAINTENANCE_MODE,
    Permission.VIEW_LOGS,
    Permission.OWNER_IMMUNITY,
    Permission.TRANSFER_OWNERSHIP
  ],
  ADMIN: [
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.BAN_USERS,
    Permission.VIEW_GAMES,
    Permission.VIEW_ECONOMY,
    Permission.POST_ANNOUNCEMENTS,
    Permission.VIEW_REPORTS,
    Permission.HANDLE_REPORTS,
    Permission.VIEW_LOGS
  ],
  PLAYER: [
    Permission.VIEW_GAMES,
    Permission.TRANSFER_GEMS
  ]
} as const

export class PermissionManager {
  static hasPermission(role: string, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
    return permissions ? (permissions as readonly Permission[]).includes(permission) : false
  }

  static hasAnyPermission(role: string, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission))
  }

  static hasAllPermissions(role: string, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission))
  }

  static getRolePermissions(role: string): readonly Permission[] {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []
  }

  static isProtectedAction(action: string, targetRole: string, actorRole: string): boolean {
    // Owner cannot be modified by anyone except themselves
    if (targetRole === 'OWNER' && actorRole !== 'OWNER') {
      return true
    }

    // Admin can only be modified by Owner
    if (targetRole === 'ADMIN' && actorRole !== 'OWNER') {
      return true
    }

    return false
  }

  static validatePermissionTransition(
    currentRole: string,
    targetRole: string,
    actorRole: string
  ): { valid: boolean; reason?: string } {
    // Owner can do anything
    if (actorRole === 'OWNER') {
      return { valid: true }
    }

    // Admin limitations
    if (actorRole === 'ADMIN') {
      // Admin cannot modify owner or other admins
      if (targetRole === 'OWNER' || targetRole === 'ADMIN') {
        return { 
          valid: false, 
          reason: 'Admins cannot modify owner or other admin accounts' 
        }
      }

      // Admin can only assign player roles
      if (targetRole !== 'PLAYER') {
        return { 
          valid: false, 
          reason: 'Admins can only assign player roles' 
        }
      }
    }

    // Player cannot modify anyone
    if (actorRole === 'PLAYER') {
      return { 
        valid: false, 
        reason: 'Players cannot modify user roles' 
      }
    }

    return { valid: true }
  }
}