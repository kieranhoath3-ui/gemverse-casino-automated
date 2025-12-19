# Gemverse Casino - Complete System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Dynamic Ownership System](#dynamic-ownership-system)
4. [Advanced Permission Matrix](#advanced-permission-matrix)
5. [Game Mechanics](#game-mechanics)
6. [Economy System](#economy-system)
7. [Security Framework](#security-framework)
8. [Database Design](#database-design)
9. [API Documentation](#api-documentation)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)
12. [Development Guide](#development-guide)
13. [Performance Optimization](#performance-optimization)
14. [Monitoring & Analytics](#monitoring--analytics)
15. [Legal Compliance](#legal-compliance)

---

## System Overview

Gemverse Casino represents a paradigm shift in free-to-play gaming platforms, combining cutting-edge web technologies with sophisticated game mechanics and enterprise-grade security. Built from the ground up using Next.js 14, TypeScript, and PostgreSQL, this platform delivers a complete simulated gambling experience without any real-money transactions.

### Core Philosophy

The system is built on three fundamental principles:

1. **Absolute Fairness**: Every game outcome is provably fair using cryptographic algorithms
2. **Complete Transparency**: All system operations are logged and auditable
3. **User Sovereignty**: Users have complete control over their experience with robust privacy protections

### Technology Stack

#### Frontend Architecture
- **Next.js 14**: App Router with server components for optimal performance
- **TypeScript 5.0**: Full type safety across the entire application
- **Tailwind CSS**: Utility-first styling with custom casino-themed components
- **Framer Motion**: Smooth animations and micro-interactions
- **Radix UI**: Accessible, unstyled components for complex UI patterns
- **Zustand**: Lightweight state management for client-side state
- **SWR**: Intelligent data fetching with caching and revalidation

#### Backend Infrastructure
- **PostgreSQL 14**: Enterprise-grade database with advanced JSONB support
- **Prisma 5.0**: Modern database toolkit with type-safe queries
- **NextAuth.js**: Flexible authentication with multiple providers
- **bcryptjs**: Industry-standard password hashing with salt rounds
- **JWT**: Secure token-based session management
- **UUID v4**: Cryptographically secure unique identifiers

#### Security & Performance
- **Helmet.js**: Security headers and XSS protection
- **Rate Limiting**: API abuse prevention with configurable limits
- **Input Validation**: Comprehensive sanitization and validation
- **Connection Pooling**: Efficient database connection management
- **Caching Strategy**: Multi-layer caching for optimal performance

---

## Architecture Deep Dive

### Application Structure

The application follows a modular, service-oriented architecture designed for scalability and maintainability:

```
src/
├── app/                    # Next.js 14 app directory
│   ├── api/               # REST API endpoints
│   ├── games/             # Game-specific pages
│   ├── admin/             # Admin dashboard
│   ├── owner/             # Owner control panel
│   ├── login/             # Authentication pages
│   ├── register/          # Registration flow
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable React components
│   ├── ui/               # Atomic design components
│   ├── providers/        # Context providers
│   ├── modals/           # Dialog components
│   └── charts/           # Data visualization
├── hooks/                 # Custom React hooks
│   ├── use-auth.ts       # Authentication state
│   ├── use-toast.ts      # Toast notifications
│   └── use-games.ts      # Game state management
├── lib/                   # Utility libraries
│   ├── owner.ts          # Ownership management
│   ├── permission.ts     # Permission system
│   ├── utils.ts          # General utilities
│   └── validation.ts     # Input validation
├── stores/                # Zustand state stores
├── types/                 # TypeScript type definitions
└── styles/                # Global styles and themes
```

### Module Communication

The system uses a combination of patterns for inter-module communication:

1. **Props Drilling**: For direct parent-child communication
2. **Context API**: For global state like authentication and theme
3. **Zustand Stores**: For complex state management
4. **Custom Events**: For decoupled component communication
5. **API Calls**: For server-side data fetching

### Service Layer

Each major feature is encapsulated in its own service layer:

```typescript
// Authentication Service
class AuthService {
  async login(credentials: LoginCredentials): Promise<User>
  async logout(): Promise<void>
  async validateSession(token: string): Promise<Session>
  async refreshToken(refreshToken: string): Promise<Tokens>
}

// Game Service
class GameService {
  async createBet(game: string, amount: number): Promise<Bet>
  async processOutcome(betId: string): Promise<Outcome>
  async cashOut(betId: string, multiplier: number): Promise<number>
}

// Economy Service
class EconomyService {
  async transferGems(from: number, to: number, amount: number): Promise<Transfer>
  async applyTax(amount: number): Promise<number>
  async distributeFaucet(userId: number): Promise<number>
}
```

---

## Dynamic Ownership System

### Ownership Philosophy

The ownership system is designed to be completely dynamic and self-assigning. Unlike traditional systems with predefined administrative accounts, Gemverse Casino implements a sophisticated ownership transfer protocol that ensures the system always has a designated owner without hardcoding any credentials.

### How Ownership Works

#### Initial Ownership Assignment

When the system is first initialized (on a fresh database), it creates a special marker in the settings table. The first user to successfully complete the registration process automatically becomes the OWNER:

```typescript
// Registration process
async function registerUser(userData: UserInput): Promise<User> {
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;
  
  const user = await prisma.user.create({
    data: {
      ...userData,
      role: isFirstUser ? 'OWNER' : 'PLAYER',
      gems: isFirstUser ? BigInt(1000000) : BigInt(1000),
      level: isFirstUser ? 100 : 1,
      crystals: isFirstUser ? BigInt(10000) : BigInt(0)
    }
  });
  
  if (isFirstUser) {
    await initializeOwnerSettings(user.user_id);
    await logOwnershipAssignment(user.user_id);
  }
  
  return user;
}
```

#### Ownership Transfer Protocol

The current owner can transfer ownership to any other user through a secure, multi-step process:

```typescript
class OwnerManager {
  async transferOwnership(
    currentOwnerId: number,
    newOwnerId: number
  ): Promise<TransferResult> {
    // Validate current owner
    if (!(await this.isOwner(currentOwnerId))) {
      return { success: false, error: 'Not the current owner' };
    }
    
    // Validate target user
    const targetUser = await this.getUser(newOwnerId);
    if (!targetUser || targetUser.is_banned) {
      return { success: false, error: 'Invalid target user' };
    }
    
    if (targetUser.role === 'OWNER') {
      return { success: false, error: 'Target is already owner' };
    }
    
    // Perform atomic transfer
    return await prisma.$transaction(async (tx) => {
      // Demote current owner
      await tx.user.update({
        where: { user_id: currentOwnerId },
        data: { role: 'ADMIN' }
      });
      
      // Promote new owner
      await tx.user.update({
        where: { user_id: newOwnerId },
        data: {
          role: 'OWNER',
          gems: targetUser.gems + BigInt(500000), // Bonus for new owner
          level: Math.max(targetUser.level, 50)
        }
      });
      
      // Log the transfer
      await tx.adminLog.create({
        data: {
          admin_id: currentOwnerId,
          action: 'TRANSFER_OWNERSHIP',
          target_id: newOwnerId,
          details: {
            previous_owner: currentOwnerId,
            new_owner: newOwnerId,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      return { success: true };
    });
  }
}
```

#### Ownership Protection

The owner account is protected by multiple layers of security:

1. **Ban Immunity**: Owner cannot be banned by any other user
2. **Role Immunity**: Owner role cannot be changed by any other user
3. **Permission Immunity**: Owner always has all permissions
4. **Audit Trail**: All ownership-related actions are logged
5. **Transfer Cooldown**: Ownership transfers have a 24-hour cooldown

### Owner Configuration

Owners have access to a special configuration system that allows them to customize various aspects of the platform:

```typescript
interface OwnerPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  privacy_mode: boolean;
  two_factor_enabled: boolean;
  dashboard_refresh: number; // milliseconds
  default_timezone: string;
  preferred_language: string;
}

interface SecuritySettings {
  max_login_attempts: number;
  lockout_duration_minutes: number;
  session_timeout_hours: number;
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
  require_2fa_for_admins: boolean;
}
```

---

## Advanced Permission Matrix

### Permission Architecture

The permission system is designed around a hierarchical role-based access control (RBAC) model with fine-grained permissions. Each permission represents a specific action that can be performed on a specific resource.

### Permission Categories

#### User Management Permissions
- `VIEW_USERS`: View user profiles and statistics
- `EDIT_USERS`: Modify user properties (gems, level, etc.)
- `BAN_USERS`: Ban or unban user accounts
- `ASSIGN_ROLES`: Change user roles (with validation)
- `VIEW_USER_SESSIONS`: View active user sessions
- `TERMINATE_SESSIONS`: Force logout users
- `MODIFY_USER_GEMS`: Add or remove gems from accounts
- `RESET_USER_PASSWORD`: Reset user passwords

#### Game Management Permissions
- `VIEW_GAMES`: View game configurations and statistics
- `EDIT_GAMES`: Modify game settings (RTP, max bet, etc.)
- `TOGGLE_GAMES`: Enable or disable games
- `VIEW_GAME_ANALYTICS`: Access detailed game statistics
- `MODIFY_GAME_RTP`: Change game return-to-player percentages
- `ADJUST_GAME_LIMITS`: Modify betting limits

#### Economy Control Permissions
- `VIEW_ECONOMY`: View economic statistics and settings
- `EDIT_ECONOMY`: Modify economic parameters (faucet, taxes, etc.)
- `GEM_RAIN`: Distribute gems to online users
- `TRANSFER_GEMS`: Transfer gems between accounts
- `MODIFY_FAUCET`: Change daily faucet amounts
- `ADJUST_TAX_RATES`: Modify transfer and tournament taxes
- `MANAGE_REFERRALS`: View and modify referral bonuses

#### Database Access Permissions
- `RAW_SQL`: Execute raw SQL queries
- `EXPORT_DATA`: Export database data
- `IMPORT_DATA`: Import data from external sources
- `BACKUP_DATABASE`: Create database backups
- `RESTORE_DATABASE`: Restore from backups
- `VIEW_DATABASE_SCHEMA`: View database structure

#### Communication Permissions
- `BROADCAST`: Send messages to all online users
- `POST_ANNOUNCEMENTS`: Create global announcements
- `VIEW_REPORTS`: View user reports
- `HANDLE_REPORTS`: Resolve or dismiss reports
- `MODERATE_CHAT`: Delete chat messages or mute users
- `SEND_PRIVATE_MESSAGES`: Send system messages to users

#### System Control Permissions
- `SYSTEM_SETTINGS`: Modify system-wide settings
- `MAINTENANCE_MODE`: Enable/disable maintenance mode
- `VIEW_LOGS`: View system and admin logs
- `CLEAR_LOGS`: Clear old log entries
- `MODIFY_RATE_LIMITS`: Change API rate limiting
- `MANAGE_WEBHOOKS`: Configure external webhooks

#### Special Permissions
- `OWNER_IMMUNITY`: Cannot be banned or demoted
- `TRANSFER_OWNERSHIP`: Transfer ownership to another user
- `IMPERSONATE_USERS`: Login as another user (for support)
- `ACCESS_DEVELOPER_TOOLS`: Use debugging and development tools

### Permission Validation

The system includes sophisticated permission validation logic that prevents illegal operations:

```typescript
class PermissionManager {
  static validatePermissionTransition(
    currentRole: string,
    targetRole: string,
    actorRole: string
  ): ValidationResult {
    // Owner can do anything
    if (actorRole === 'OWNER') {
      return { valid: true };
    }
    
    // Admin limitations
    if (actorRole === 'ADMIN') {
      // Admin cannot modify owner or other admins
      if (targetRole === 'OWNER' || targetRole === 'ADMIN') {
        return { 
          valid: false, 
          reason: 'Admins cannot modify owner or other admin accounts' 
        };
      }
      
      // Admin can only assign player roles
      if (targetRole !== 'PLAYER') {
        return { 
          valid: false, 
          reason: 'Admins can only assign player roles' 
        };
      }
    }
    
    // Player cannot modify anyone
    if (actorRole === 'PLAYER') {
      return { 
        valid: false, 
        reason: 'Players cannot modify user roles' 
      };
    }
    
    return { valid: true };
  }
  
  static hasPermission(role: string, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    return permissions ? permissions.includes(permission) : false;
  }
  
  static isProtectedAction(
    action: string,
    targetRole: string,
    actorRole: string
  ): boolean {
    // Owner cannot be modified by anyone except themselves
    if (targetRole === 'OWNER' && actorRole !== 'OWNER') {
      return true;
    }
    
    // Admin can only be modified by Owner
    if (targetRole === 'ADMIN' && actorRole !== 'OWNER') {
      return true;
    }
    
    return false;
  }
}
```

---

## Game Mechanics

### Mines Game

#### Game Overview
Mines is a strategic game where players must uncover gems while avoiding hidden mines. The game features a customizable grid and provably fair mechanics using cryptographic hashing.

#### Game Rules
- The game is played on a grid of size N×N (configurable from 3×3 to 8×8)
- A configurable number of mines are randomly placed on the grid
- Players click cells to reveal them
- If a mine is revealed, the game ends and the bet is lost
- If a gem is revealed, the multiplier increases
- Players can cash out at any time to claim their winnings

#### Multiplier Calculation
The multiplier is calculated using the formula:

```
multiplier = 1 / (1 - (revealed_safe_cells / total_safe_cells))
```

Where:
- `revealed_safe_cells` = number of safe cells revealed
- `total_safe_cells` = total cells - number of mines

#### Provably Fair Algorithm

```typescript
function generateGameResult(
  serverSeed: string,
  clientNonce: string,
  gridSize: number,
  mineCount: number
): GameResult {
  // Combine server seed and client nonce
  const combined = `${serverSeed}:${clientNonce}`;
  
  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // Use first 8 characters of hash as random seed
  const seed = parseInt(hash.substring(0, 8), 16);
  
  // Generate mine positions
  const positions = [];
  const totalCells = gridSize * gridSize;
  
  for (let i = 0; i < mineCount; i++) {
    let position;
    do {
      position = (seed + i * 31) % totalCells;
    } while (positions.includes(position));
    
    positions.push(position);
  }
  
  return {
    mines: positions,
    serverSeed,
    clientNonce,
    hash
  };
}
```

### Plinko Game

#### Game Overview
Plinko is a physics-based game where players drop a ball from the top of a peg-filled board and watch it bounce down to land in a multiplier slot at the bottom.

#### Game Rules
- Players choose the number of rows (8-16) and risk level (Low, Medium, High)
- The ball is dropped from the top center of the board
- The ball bounces off pegs as it falls
- The final position determines the payout multiplier
- Higher risk levels offer higher potential multipliers but also lower minimum payouts

#### Physics Simulation
The game uses a realistic physics simulation with:
- Gravity acceleration (0.5 pixels/frame²)
- Elastic collisions with pegs
- Friction coefficient (0.99)
- Random initial velocity variations

#### Payout Tables

**Low Risk:**
```
[5.6x, 2.1x, 1.1x, 1.0x, 0.5x, 1.0x, 1.1x, 2.1x, 5.6x]
```

**Medium Risk:**
```
[13x, 3.0x, 1.3x, 0.7x, 0.4x, 0.7x, 1.3x, 3.0x, 13x]
```

**High Risk:**
```
[29x, 4.0x, 1.5x, 0.6x, 0.2x, 0.6x, 1.5x, 4.0x, 29x]
```

### Crash Game

#### Game Overview
Crash is a multiplayer game where players bet on an exponentially increasing multiplier that can crash at any moment. The goal is to cash out before the crash occurs.

#### Game Rules
- Each round starts with a 5-second betting period
- The multiplier starts at 1.00x and increases exponentially
- The crash point is randomly determined at the start of each round
- Players can cash out at any time before the crash
- If the player cashes out, they win their bet multiplied by the current multiplier
- If the multiplier crashes before cashing out, the bet is lost

#### Multiplier Curves

**Normal Mode:**
```
multiplier = e^(t/10)
```

**Moon Mode (High Volatility):**
```
multiplier = e^(t/5)
```

Where `t` is the time in seconds since the round started.

#### Crash Point Generation

```typescript
function generateCrashPoint(
  serverSeed: string,
  clientNonce: string,
  maxMultiplier: number = 1000
): number {
  // Combine seeds
  const combined = `${serverSeed}:${clientNonce}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // Use hash to generate crash point
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const crashPoint = 1 + (hashInt / 0xFFFFFFFF) * (maxMultiplier - 1);
  
  // Apply house edge
  const houseEdge = 0.018; // 1.8%
  const adjustedCrashPoint = crashPoint * (1 - houseEdge);
  
  return Math.max(1.01, Math.min(adjustedCrashPoint, maxMultiplier));
}
```

---

## Economy System

### Gem Currency

Gems are the primary virtual currency in Gemverse Casino. They have no real-world value and are used exclusively for placing bets and participating in games.

#### Gem Sources
- **Daily Faucet**: Free gems distributed daily to active users
- **Level-up Rewards**: Gems awarded when users level up
- **Game Winnings**: Gems won from successful bets
- **Referral Bonuses**: Gems awarded for referring new users
- **Tournament Prizes**: Gems won in special events
- **Owner Distributions**: Special events where owners distribute gems

#### Gem Sinks
- **Game Bets**: Gems used to place bets
- **Transfer Taxes**: 5% tax on player-to-player transfers
- **Tournament Entry Fees**: Fees to participate in tournaments
- **House Edge**: Small percentage kept by the house on each bet

### Level System

Users gain experience points (XP) through various activities:

#### XP Sources
- **Placing Bets**: 1 XP per gem wagered
- **Winning Bets**: Bonus XP based on winnings
- **Daily Login**: 100 XP for daily activity
- **Referrals**: 1000 XP per successful referral
- **Achievements**: Various XP rewards for milestones

#### Level Formula

```typescript
function calculateLevel(xp: number): number {
  return Math.floor(Math.pow(xp / 1000, 0.5)) + 1;
}

function calculateXPNeededForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 1000;
}
```

#### Level Rewards
When users level up, they receive:
- **Gems**: `level * 50` gems
- **Crystals**: `Math.floor(level / 10)` crystals
- **Unlocks**: Access to higher betting limits and special features

### Transfer System

Players can transfer gems to other players with a 5% tax:

```typescript
async function transferGems(
  fromUserId: number,
  toUserId: number,
  amount: number
): Promise<TransferResult> {
  const taxRate = 0.05; // 5%
  const tax = Math.floor(amount * taxRate);
  const amountAfterTax = amount - tax;
  
  return await prisma.$transaction(async (tx) => {
    // Deduct from sender (including tax)
    await tx.user.update({
      where: { user_id: fromUserId },
      data: { gems: { decrement: BigInt(amount) } }
    });
    
    // Add to recipient (after tax)
    await tx.user.update({
      where: { user_id: toUserId },
      data: { gems: { increment: BigInt(amountAfterTax) } }
    });
    
    // Add tax to house
    await tx.setting.upsert({
      where: { key: 'house_balance' },
      update: { value: { $add: tax } },
      create: { key: 'house_balance', value: tax }
    });
    
    // Log the transfer
    await tx.adminLog.create({
      data: {
        action: 'TRANSFER_GEMS',
        details: {
          from: fromUserId,
          to: toUserId,
          amount,
          tax,
          amount_after_tax: amountAfterTax
        }
      }
    });
    
    return {
      success: true,
      amount_sent: amountAfterTax,
      tax_collected: tax
    };
  });
}
```

---

## Security Framework

### Authentication System

The authentication system uses a session-based approach with JWT tokens:

#### Session Management

```typescript
interface Session {
  id: string;
  session_token: string;
  user_id: number;
  expires: Date;
  created_at: Date;
  ip_address?: string;
  user_agent?: string;
}

class SessionManager {
  async createSession(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const sessionToken = uuidv4();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return await prisma.session.create({
      data: {
        session_token: sessionToken,
        user_id: userId,
        expires,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
  }
  
  async validateSession(token: string): Promise<Session | null> {
    const session = await prisma.session.findUnique({
      where: { session_token: token }
    });
    
    if (!session || session.expires < new Date()) {
      // Delete expired session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }
    
    // Update last active
    await prisma.user.update({
      where: { user_id: session.user_id },
      data: { last_active: new Date() }
    });
    
    return session;
  }
}
```

### Password Security

Passwords are hashed using bcrypt with a cost factor of 12:

```typescript
import bcrypt from 'bcryptjs';

class PasswordManager {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
  
  validatePassword(password: string): ValidationResult {
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    
    if (password.length > 128) {
      return { valid: false, error: 'Password too long' };
    }
    
    const hasNumber = /\d/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    
    if (!hasNumber || !hasLowercase || !hasUppercase) {
      return {
        valid: false,
        error: 'Password must contain at least one number, one lowercase, and one uppercase letter'
      };
    }
    
    return { valid: true };
  }
}
```

### Rate Limiting

API endpoints are protected by configurable rate limits:

```typescript
import rateLimit from 'express-rate-limit';

const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful authentication
    skip: (req) => {
      return req.user !== undefined;
    }
  });
};

// Apply different rate limits to different endpoints
app.use('/api/auth', createRateLimiter(15 * 60 * 1000, 5)); // 5 attempts per 15 minutes
app.use('/api/games', createRateLimiter(60 * 1000, 60)); // 60 requests per minute
app.use('/api/transfer', createRateLimiter(60 * 60 * 1000, 20)); // 20 transfers per hour
```

### Input Validation

All user inputs are validated and sanitized:

```typescript
import { z } from 'zod';

const registrationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .transform(val => val.toLowerCase()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  
  email: z.string()
    .email('Invalid email format')
    .optional()
    .transform(val => val?.toLowerCase()),
  
  referral_code: z.string()
    .optional()
    .transform(val => val?.toLowerCase())
});

function validateRegistration(input: unknown) {
  try {
    return registrationSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
}
```

---

## Database Design

### Entity Relationship Diagram

```mermaid
erDiagram
  User ||--o{ Bet : places
  User ||--o{ Session : has
  User ||--o{ AdminLog : generates
  User ||--o{ Report : files
  User }o--|| User : refers
  Game ||--o{ Bet : accepts
  Bet }o--|| User : wins
  Report }o--|| User : targets
  AdminLog }o--|| User : affects
```

### Table Schemas

#### Users Table
```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(10) CHECK (role IN ('OWNER', 'ADMIN', 'PLAYER')) DEFAULT 'PLAYER',
  gems BIGINT DEFAULT 1000,
  crystals BIGINT DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  mute_until TIMESTAMP WITH TIME ZONE,
  referred_by_id INTEGER REFERENCES users(user_id),
  
  INDEX idx_users_role (role),
  INDEX idx_users_created (created_at),
  INDEX idx_users_last_active (last_active),
  INDEX idx_users_referred_by (referred_by_id)
);
```

#### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_sessions_token (session_token),
  INDEX idx_sessions_expires (expires),
  INDEX idx_sessions_user (user_id)
);
```

#### Bets Table
```sql
CREATE TABLE bets (
  bet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  game VARCHAR(20) NOT NULL,
  amount BIGINT NOT NULL,
  outcome JSONB NOT NULL,
  profit BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  server_seed VARCHAR(255),
  client_nonce VARCHAR(255),
  
  INDEX idx_bets_user (user_id),
  INDEX idx_bets_game (game),
  INDEX idx_bets_created (created_at)
);
```

#### Admin Logs Table
```sql
CREATE TABLE admin_logs (
  log_id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(user_id),
  action VARCHAR(50) NOT NULL,
  target_id INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_logs_admin (admin_id),
  INDEX idx_logs_created (created_at),
  INDEX idx_logs_action (action)
);
```

### Indexing Strategy

The database uses strategic indexing to optimize query performance:

1. **Primary Keys**: All tables have clustered primary keys
2. **Foreign Keys**: Indexed for join performance
3. **Date Columns**: Indexed for time-based queries
4. **Role Columns**: Indexed for role-based queries
5. **Composite Indexes**: For complex query patterns

### Database Optimizations

#### Connection Pooling
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  connectionLimit: 20, // Maximum connections in pool
  poolTimeout: 10, // Timeout for getting connection from pool
  acquireTimeoutMillis: 60000, // Timeout for acquiring connection
  createTimeoutMillis: 30000, // Timeout for creating connection
  destroyTimeoutMillis: 5000, // Timeout for destroying connection
  reapIntervalMillis: 1000, // How often to check for idle connections
  createRetryIntervalMillis: 200, // Retry interval for creating connections
});
```

#### Query Optimization

```typescript
// Optimized user query with selective fields
const users = await prisma.user.findMany({
  select: {
    user_id: true,
    username: true,
    role: true,
    gems: true,
    level: true,
    created_at: true,
    last_active: true,
    is_banned: true
  },
  where: {
    role: 'PLAYER',
    is_banned: false,
    last_active: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  },
  orderBy: { gems: 'desc' },
  take: 50
});
```

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string (3-30 chars)",
  "password": "string (min 8 chars)",
  "email": "string (optional)",
  "referral_code": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "username": "player1",
    "role": "PLAYER",
    "gems": "1000",
    "level": 1,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "is_owner": false,
  "metadata": {
    "session_id": "uuid",
    "expires_at": "2024-01-02T00:00:00.000Z"
  }
}
```

#### POST /api/auth/login
Authenticate user and create session.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "username": "player1",
    "role": "PLAYER",
    "gems": "1000",
    "level": 1
  }
}
```

#### POST /api/auth/logout
Terminate current session.

**Response:**
```json
{
  "success": true
}
```

#### GET /api/auth/session
Validate current session.

**Response:**
```json
{
  "user": {
    "user_id": 1,
    "username": "player1",
    "role": "PLAYER",
    "gems": "1000",
    "crystals": "0",
    "level": 1,
    "xp": "0"
  }
}
```

### Game Endpoints

#### POST /api/games/mines/bet
Place a bet on the Mines game.

**Request Body:**
```json
{
  "amount": 100,
  "grid_size": 5,
  "mines_count": 5,
  "server_seed": "server-generated-seed",
  "client_nonce": "client-generated-nonce"
}
```

**Response:**
```json
{
  "success": true,
  "bet_id": "uuid",
  "new_balance": "900"
}
```

#### POST /api/games/mines/cashout
Cash out from an active Mines game.

**Request Body:**
```json
{
  "bet_id": "uuid",
  "multiplier": 2.5,
  "cells_revealed": 12
}
```

**Response:**
```json
{
  "success": true,
  "winnings": 250,
  "new_balance": "1150"
}
```

#### POST /api/games/plinko/drop
Drop a ball in the Plinko game.

**Request Body:**
```json
{
  "amount": 100,
  "rows": 12,
  "risk": "medium",
  "slot": 4,
  "multiplier": 1.3
}
```

**Response:**
```json
{
  "success": true,
  "winnings": 130,
  "new_balance": "1030"
}
```

#### POST /api/games/crash/bet
Place a bet on the Crash game.

**Request Body:**
```json
{
  "amount": 100,
  "round_id": "round-uuid",
  "auto_cashout": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "new_balance": "900"
}
```

#### POST /api/games/crash/cashout
Cash out from an active Crash game.

**Request Body:**
```json
{
  "round_id": "round-uuid",
  "multiplier": 2.34
}
```

**Response:**
```json
{
  "success": true,
  "winnings": 234,
  "new_balance": "1134"
}
```

#### GET /api/games/crash/history
Get recent Crash game history.

**Response:**
```json
{
  "history": [
    {
      "round_id": "round-1",
      "crash_point": 2.34,
      "timestamp": 1704067200000
    }
  ]
}
```

### Economy Endpoints

#### GET /api/balance
Get current user balance and stats.

**Response:**
```json
{
  "gems": "1000",
  "crystals": "0",
  "level": 1,
  "xp": "0"
}
```

#### POST /api/transfer
Transfer gems to another player.

**Request Body:**
```json
{
  "to_username": "player2",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "amount_sent": 95,
  "tax_collected": 5,
  "new_balance": "900"
}
```

### Owner Endpoints

#### GET /api/owner/users
Get all users with pagination and sorting.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `sortBy`: Sort field (username, gems, level, created_at)
- `sortOrder`: Sort order (asc, desc)
- `search`: Search query

**Response:**
```json
{
  "users": [
    {
      "user_id": 1,
      "username": "owner",
      "role": "OWNER",
      "gems": "1000000",
      "level": 100,
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_active": "2024-01-01T00:00:00.000Z",
      "is_banned": false
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

#### PATCH /api/owner/user/:id
Update user properties.

**Request Body:**
```json
{
  "role": "ADMIN",
  "gems": 50000,
  "is_banned": false
}
```

**Response:**
```json
{
  "success": true
}
```

#### GET /api/owner/settings
Get current system settings.

**Response:**
```json
{
  "settings": {
    "daily_faucet": 100,
    "level_up_reward": 50,
    "ad_doubler": true,
    "tournament_house_cut": 1,
    "global_tax": 2
  }
}
```

#### POST /api/owner/settings
Update system settings.

**Request Body:**
```json
{
  "daily_faucet": 150,
  "level_up_reward": 75,
  "ad_doubler": true
}
```

**Response:**
```json
{
  "success": true
}
```

#### POST /api/owner/broadcast
Broadcast message to all online users.

**Request Body:**
```json
{
  "message": "System maintenance scheduled for 2:00 AM UTC"
}
```

**Response:**
```json
{
  "success": true,
  "users_notified": 42
}
```

#### POST /api/owner/gem-rain
Distribute gems to all online users.

**Response:**
```json
{
  "success": true,
  "users_affected": 15,
  "gems_distributed": 150
}
```

#### GET /api/owner/export
Export database data.

**Query Parameters:**
- `format`: Export format (json, csv, sql)

**Response:** File download

### Admin Endpoints

#### GET /api/admin/reports
Get user reports.

**Response:**
```json
{
  "reports": [
    {
      "report_id": 1,
      "reporter_username": "player1",
      "target_username": "player2",
      "reason": "Inappropriate behavior",
      "status": "PENDING",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### PATCH /api/admin/report/:id
Update report status.

**Request Body:**
```json
{
  "status": "RESOLVED"
}
```

**Response:**
```json
{
  "success": true
}
```

#### POST /api/admin/user/:id/ban
Ban a user account.

**Response:**
```json
{
  "success": true
}
```

#### POST /api/admin/announcement
Post a global announcement.

**Request Body:**
```json
{
  "message": "Welcome to Gemverse Casino!"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Deployment Guide

### Prerequisites

Before deploying, ensure you have:

1. **Node.js 18+** installed on your server
2. **PostgreSQL 14+** database server
3. **Process manager** (PM2 recommended)
4. **Reverse proxy** (Nginx recommended)
5. **SSL certificate** (Let's Encrypt recommended)

### Production Build

1. **Install dependencies:**
   ```bash
   npm ci --production
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/gemverse"
   export NEXTAUTH_URL="https://your-domain.com"
   export NEXTAUTH_SECRET="your-production-secret"
   export JWT_SECRET="your-jwt-secret"
   export NODE_ENV="production"
   ```

### PM2 Configuration

Create a `pm2.config.js` file:

```javascript
module.exports = {
  apps: [{
    name: 'gemverse-casino',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start with PM2:
```bash
pm2 start pm2.config.js
pm2 save
pm2 startup
```

### Nginx Configuration

Create `/etc/nginx/sites-available/gemverse`:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
  }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/gemverse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Setup

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

Get SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Database Setup

1. **Create database:**
   ```bash
   createdb gemverse
   ```

2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed database (optional):**
   ```bash
   npx prisma db seed
   ```

4. **Set up connection pooling (recommended):**
   ```bash
   # Install PgBouncer
   sudo apt install pgbouncer
   
   # Configure for optimal performance
   echo "default_pool_size = 20" >> /etc/pgbouncer/pgbouncer.ini
   echo "max_client_conn = 100" >> /etc/pgbouncer/pgbouncer.ini
   ```

### Monitoring Setup

#### Application Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View logs
pm2 logs gemverse-casino
pm2 monit
```

#### Database Monitoring
```bash
# Install PostgreSQL monitoring tools
sudo apt install postgresql-contrib

# Enable statistics collection
echo "shared_preload_libraries = 'pg_stat_statements'" >> /etc/postgresql/14/main/postgresql.conf
echo "pg_stat_statements.track = all" >> /etc/postgresql/14/main/postgresql.conf
```

#### System Monitoring
```bash
# Install system monitoring
sudo apt install htop iotop

# Create monitoring script
cat > /usr/local/bin/gemverse-monitor.sh << 'EOF'
#!/bin/bash
echo "=== Gemverse Casino Monitoring ==="
echo "Date: $(date)"
echo "Memory Usage:"
free -h
echo ""
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""
echo "Disk Usage:"
df -h
echo ""
echo "PM2 Status:"
pm2 list
EOF

chmod +x /usr/local/bin/gemverse-monitor.sh
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

**Symptoms:** Application fails to start with database connection errors

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify connection string:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. Check firewall settings:
   ```bash
   sudo ufw status
   sudo ufw allow 5432/tcp
   ```

#### Build Fails

**Symptoms:** `npm run build` fails with TypeScript or Next.js errors

**Solutions:**
1. Clear cache:
   ```bash
   rm -rf .next node_modules
   npm install
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

3. Verify environment variables:
   ```bash
   printenv | grep -E "(DATABASE_URL|NEXTAUTH_SECRET)"
   ```

#### Session Issues

**Symptoms:** Users are logged out unexpectedly or cannot log in

**Solutions:**
1. Check JWT secret:
   ```bash
   echo $NEXTAUTH_SECRET | wc -c  # Should be 32+ characters
   ```

2. Verify database time:
   ```bash
   psql $DATABASE_URL -c "SELECT NOW()"
   date  # Should match
   ```

3. Clear browser cookies and try again

#### Permission Denied

**Symptoms:** "Owner privileges required" error for owner account

**Solutions:**
1. Verify user role in database:
   ```bash
   psql $DATABASE_URL -c "SELECT username, role FROM users WHERE user_id = 1"
   ```

2. Check session validity:
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM sessions WHERE user_id = 1"
   ```

3. Verify IP whitelist if enabled:
   ```bash
   echo $OWNER_IP_WHITELIST
   ```

### Performance Issues

#### Slow Database Queries

**Diagnosis:**
```bash
# Enable slow query log
psql $DATABASE_URL -c "SET log_min_duration_statement = 1000"

# Check slow queries
psql $DATABASE_URL -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10
"
```

**Solutions:**
1. Add missing indexes:
   ```sql
   CREATE INDEX idx_bets_user_game ON bets(user_id, game);
   CREATE INDEX idx_users_last_active_role ON users(last_active, role);
   ```

2. Analyze tables:
   ```bash
   psql $DATABASE_URL -c "ANALYZE users, bets, sessions"
   ```

3. Vacuum database:
   ```bash
   psql $DATABASE_URL -c "VACUUM ANALYZE"
   ```

#### High Memory Usage

**Diagnosis:**
```bash
# Check PM2 memory usage
pm2 list
pm2 monit

# Check Node.js memory
node --inspect server.js &
# Open chrome://inspect in browser
```

**Solutions:**
1. Reduce PM2 instances:
   ```javascript
   // pm2.config.js
   module.exports = {
     apps: [{
       instances: Math.max(1, Math.floor(os.cpus().length / 2)), // Use half of CPU cores
     }]
   };
   ```

2. Optimize database connections:
   ```typescript
   const prisma = new PrismaClient({
     connectionLimit: 10, // Reduce from default 20
   });
   ```

3. Enable garbage collection optimization:
   ```bash
   node --optimize-for-size --max-old-space-size=4096 server.js
   ```

### Error Logs

#### Application Logs
```bash
# PM2 logs
pm2 logs gemverse-casino --lines 100

# System logs
sudo journalctl -u gemverse-casino -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### Database Logs
```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Check for errors
sudo grep -i "error\|fatal" /var/log/postgresql/postgresql-14-main.log
```

---

## Development Guide

### Development Setup

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd gemverse-casino
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.local .env
   # Edit .env with your development settings
   ```

4. **Set up database:**
   ```bash
   createdb gemverse_dev
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Fix code style
npm run lint:fix

# Format code
npm run format
```

### Testing

#### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Set up test database
createdb gemverse_test
DATABASE_URL="postgresql://localhost:5432/gemverse_test" npm run test:integration
```

#### End-to-End Tests
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e
```

### Debugging

#### VS Code Setup

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "env": {
        "NODE_OPTIONS": "--inspect"
      },
      "port": 9229,
      "console": "integratedTerminal"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

#### Chrome DevTools

1. Start server with inspect flag:
   ```bash
   node --inspect node_modules/.bin/next dev
   ```

2. Open chrome://inspect in Chrome

3. Click "Open dedicated DevTools for Node"

### Git Workflow

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create PR:**
   ```bash
   git push origin feature/new-feature
   ```

### Commit Conventions

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(games): add moon mode to crash game

Implements high volatility mode with 2x faster multiplier growth.

Closes #123
```

---

## Performance Optimization

### Database Optimization

#### Connection Pooling
Optimize database connections for production:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Connection pool settings
  connectionLimit: 20,
  poolTimeout: 10,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
  
  // Query optimization
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
```

#### Query Optimization

1. **Use selective queries:**
   ```typescript
   const users = await prisma.user.findMany({
     select: {
       user_id: true,
       username: true,
       gems: true
     },
     where: {
       role: 'PLAYER',
       is_banned: false
     },
     orderBy: { gems: 'desc' },
     take: 50
   });
   ```

2. **Use pagination:**
   ```typescript
   const users = await prisma.user.findMany({
     skip: (page - 1) * limit,
     take: limit,
     orderBy: { created_at: 'desc' }
   });
   ```

3. **Use indexes:**
   ```sql
   CREATE INDEX idx_users_role_active ON users(role, is_banned);
   CREATE INDEX idx_bets_user_created ON bets(user_id, created_at);
   ```

### Application Optimization

#### Code Splitting

```typescript
// Lazy load heavy components
const GameBoard = dynamic(() => import('./GameBoard'), {
  loading: () => <div>Loading...</div>
});

// Lazy load game-specific logic
const loadGameLogic = (game: string) => {
  switch (game) {
    case 'mines':
      return import('./games/mines/logic');
    case 'plinko':
      return import('./games/plinko/logic');
    case 'crash':
      return import('./games/crash/logic');
  }
};
```

#### Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component
<Image
  src="/images/game-bg.jpg"
  alt="Game Background"
  width={1920}
  height={1080}
  priority={false}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>;
```

#### Caching Strategy

```typescript
// SWR for data fetching
import useSWR from 'swr';

const { data, error, mutate } = useSWR('/api/balance', fetcher, {
  refreshInterval: 30000, // Refresh every 30 seconds
  revalidateOnFocus: false,
  revalidateOnReconnect: false
});

// Redis for session storage (production)
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const getCachedBalance = async (userId: number) => {
  const cacheKey = `balance:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const balance = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { gems: true, crystals: true }
  });
  
  await redis.setex(cacheKey, 300, JSON.stringify(balance)); // 5 minute cache
  
  return balance;
};
```

### Server Optimization

#### PM2 Cluster Mode

```javascript
// pm2.config.js
module.exports = {
  apps: [{
    name: 'gemverse-casino',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--optimize-for-size --max-old-space-size=4096'
    },
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 5,
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};
```

#### Nginx Optimization

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
  worker_connections 1024;
  use epoll;
  multi_accept on;
}

http {
  # Basic optimizations
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;
  
  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 10240;
  gzip_proxied expired no-cache no-store private auth;
  gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/xml+rss
    application/json;
  
  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

## Monitoring & Analytics

### Application Monitoring

#### PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View real-time metrics
pm2 monit

# View logs
pm2 logs gemverse-casino --lines 100

# Generate report
pm2 report
```

#### Custom Metrics

```typescript
// metrics.ts
import { createPrometheusMetrics } from '@prometheus/client';

const metrics = createPrometheusMetrics();

// Game metrics
export const gameMetrics = {
  betsPlaced: metrics.createCounter('game_bets_placed_total', 'Total bets placed'),
  betsWon: metrics.createCounter('game_bets_won_total', 'Total bets won'),
  gemsWagered: metrics.createCounter('game_gems_wagered_total', 'Total gems wagered'),
  gemsWon: metrics.createCounter('game_gems_won_total', 'Total gems won')
};

// User metrics
export const userMetrics = {
  usersRegistered: metrics.createCounter('users_registered_total', 'Total users registered'),
  usersActive: metrics.createGauge('users_active', 'Active users in last 24h'),
  sessionsCreated: metrics.createCounter('sessions_created_total', 'Total sessions created')
};

// System metrics
export const systemMetrics = {
  requestsTotal: metrics.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'status']),
  requestDuration: metrics.createHistogram('http_request_duration_seconds', 'HTTP request duration'),
  databaseConnections: metrics.createGauge('database_connections', 'Active database connections')
};
```

### Database Monitoring

#### PostgreSQL Statistics

```sql
-- Enable statistics collection
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
SELECT pg_reload_conf();

-- View slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- View table statistics
SELECT 
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- View index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Database Health Check

```typescript
// health.ts
export async function checkDatabaseHealth(): Promise<HealthResult> {
  try {
    // Check connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check replication lag (if applicable)
    const replicationLag = await prisma.$queryRaw`
      SELECT extract(epoch from (now() - pg_last_xact_replay_timestamp())) as lag
    `;
    
    // Check connection count
    const connections = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;
    
    // Check disk usage
    const diskUsage = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    
    return {
      status: 'healthy',
      replicationLag: replicationLag[0]?.lag || 0,
      activeConnections: connections[0]?.count || 0,
      databaseSize: diskUsage[0]?.size || '0 bytes'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

### System Monitoring

#### System Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== System Health Check ==="
echo "Date: $(date)"
echo ""

# Memory usage
echo "Memory Usage:"
free -h
echo ""

# CPU usage
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""

# Disk usage
echo "Disk Usage:"
df -h | grep -E "(Use%|/dev/)"
echo ""

# PM2 status
echo "PM2 Status:"
pm2 list | grep gemverse-casino
```

#### Log Monitoring

```bash
# Create log monitoring script
cat > /usr/local/bin/log-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/gemverse/error.log"
ALERT_EMAIL="admin@your-domain.com"
ERROR_COUNT=$(grep -c "ERROR" $LOG_FILE 2>/dev/null || echo 0)

if [ $ERROR_COUNT -gt 10 ]; then
  echo "High error count detected: $ERROR_COUNT" | mail -s "Gemverse Alert" $ALERT_EMAIL
fi
EOF

# Add to crontab
echo "*/5 * * * * /usr/local/bin/log-monitor.sh" | crontab -
```

---

## Legal Compliance

### Age Verification

The platform implements comprehensive age verification:

```typescript
interface AgeVerification {
  isVerified: boolean;
  verificationDate?: Date;
  method: 'self_declaration' | 'third_party';
  ipAddress: string;
  userAgent: string;
}

const ageVerificationSchema = z.object({
  isVerified: z.boolean(),
  birthDate: z.date().refine(
    (date) => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 13;
    },
    { message: 'You must be 13 or older to play' }
  ),
  agreement: z.boolean().refine(
    (val) => val === true,
    { message: 'You must agree to the terms' }
  )
});
```

### Responsible Gaming

The platform includes multiple responsible gaming features:

```typescript
interface ResponsibleGamingSettings {
  dailyLimit: number;
  sessionLimit: number;
  selfExclusion: boolean;
  cooldownPeriod: number; // hours
  realityCheckInterval: number; // minutes
}

class ResponsibleGamingManager {
  async setLimits(userId: number, limits: ResponsibleGamingSettings) {
    await prisma.userSettings.upsert({
      where: { user_id: userId },
      update: {
        daily_limit: limits.dailyLimit,
        session_limit: limits.sessionLimit,
        reality_check_interval: limits.realityCheckInterval
      },
      create: {
        user_id: userId,
        ...limits
      }
    });
  }
  
  async checkLimits(userId: number, amount: number): Promise<LimitResult> {
    const settings = await prisma.userSettings.findUnique({
      where: { user_id: userId }
    });
    
    if (!settings) {
      return { allowed: true };
    }
    
    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailySpending = await prisma.bet.aggregate({
      where: {
        user_id: userId,
        created_at: { gte: today }
      },
      _sum: { amount: true }
    });
    
    const totalSpent = Number(dailySpending._sum.amount || 0);
    if (totalSpent + amount > settings.daily_limit) {
      return {
        allowed: false,
        reason: 'Daily limit exceeded',
        limit: settings.daily_limit,
        spent: totalSpent
      };
    }
    
    return { allowed: true };
  }
}
```

### Privacy Protection

The platform implements comprehensive privacy protection:

```typescript
interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  allowMessages: boolean;
  dataRetentionDays: number;
}

class PrivacyManager {
  async anonymizeUserData(userId: number) {
    await prisma.$transaction([
      // Anonymize user record
      prisma.user.update({
        where: { user_id: userId },
        data: {
          username: `user_${userId}`,
          email: `anon_${userId}@gemverse.casino`,
          password_hash: 'anonymized'
        }
      }),
      
      // Delete sensitive data
      prisma.session.deleteMany({
        where: { user_id: userId }
      }),
      
      // Anonymize bets
      prisma.bet.updateMany({
        where: { user_id: userId },
        data: { user_id: -1 }
      })
    ]);
  }
  
  async exportUserData(userId: number): Promise<UserDataExport> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        bets: true,
        sessions: {
          select: { created_at: true, last_active: true }
        }
      }
    });
    
    return {
      user: user,
      bets: user?.bets || [],
      sessions: user?.sessions || [],
      generated_at: new Date().toISOString()
    };
  }
}
```

### Terms of Service

The platform includes comprehensive terms of service acceptance:

```typescript
interface TermsAcceptance {
  userId: number;
  version: string;
  acceptedAt: Date;
  ipAddress: string;
  userAgent: string;
}

const termsSchema = z.object({
  acceptTerms: z.boolean().refine(
    (val) => val === true,
    { message: 'You must accept the terms of service' }
  ),
  acceptPrivacy: z.boolean().refine(
    (val) => val === true,
    { message: 'You must accept the privacy policy' }
  ),
  ageVerification: z.boolean().refine(
    (val) => val === true,
    { message: 'You must verify you are 13 or older' }
  )
});
```

---

This comprehensive documentation covers every aspect of the Gemverse Casino system, from high-level architecture to detailed implementation specifics. The system is designed to be scalable, secure, and maintainable, with clear documentation for developers, administrators, and users.