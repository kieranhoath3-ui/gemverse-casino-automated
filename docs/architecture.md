# Architecture Overview

## System Overview

Gemverse Casino is a free-to-play gaming platform built with modern web technologies. This document provides a high-level overview of the system architecture.

### Technology Stack

#### Frontend
- **Next.js 14**: App Router with server components
- **TypeScript 5.0**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animations
- **Radix UI**: Accessible components
- **Zustand**: State management
- **SWR**: Data fetching

#### Backend
- **PostgreSQL 14**: Database
- **Prisma 5.0**: ORM with type-safe queries
- **NextAuth.js**: Authentication
- **bcryptjs**: Password hashing
- **JWT**: Session management

## Application Structure

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
│   └── modals/           # Dialog components
├── hooks/                 # Custom React hooks
│   ├── use-auth.ts       # Authentication state
│   └── use-toast.ts      # Toast notifications
└── lib/                   # Utility libraries
    ├── owner.ts          # Ownership management
    ├── permission.ts     # Permission system
    └── utils.ts          # General utilities
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key tables include:

- **users**: User accounts with roles (OWNER, ADMIN, PLAYER)
- **sessions**: Authentication sessions
- **bets**: Game betting history
- **games**: Game configurations
- **admin_logs**: Administrative action logs
- **reports**: User reports
- **settings**: System-wide settings

### User Roles

1. **OWNER**: Full system access, can transfer ownership
2. **ADMIN**: User management and moderation
3. **PLAYER**: Standard user with game access

## Dynamic Ownership System

The ownership system is completely dynamic:

- **First User**: The first registered user automatically becomes OWNER
- **Transfer Protocol**: Owner can securely transfer ownership to any user
- **Protection**: Owner cannot be banned or modified by others

## Permission Matrix

Permissions are role-based with fine-grained control:

### Owner Permissions
- All system permissions
- Transfer ownership
- Database access
- System settings

### Admin Permissions
- User management (except owner/admin)
- Game moderation
- Report handling
- Announcements

### Player Permissions
- Play games
- Transfer gems
- File reports

## Game Mechanics

### Supported Games

1. **Mines**: Strategic grid-based game with configurable mines
2. **Plinko**: Physics-based ball drop game
3. **Crash**: Multiplayer multiplier game

All games use provably fair algorithms with cryptographic verification.

## Economy System

### Virtual Currency: Gems

- **Sources**: Daily faucet, game winnings, level rewards, referrals
- **Sinks**: Game bets, transfer taxes (5%), tournaments
- **No Real Value**: Gems are purely virtual with no monetary value

### Level System

Users gain XP through activities:
- Placing bets: 1 XP per gem wagered
- Winning bets: Bonus XP
- Daily login: 100 XP
- Referrals: 1000 XP

## Security Framework

### Authentication
- Session-based with JWT tokens
- bcrypt password hashing (12 rounds)
- 24-hour session expiry

### Data Protection
- Input validation on all endpoints
- SQL injection prevention (Prisma)
- XSS protection
- CSRF protection

### Rate Limiting
Configurable limits on:
- Authentication endpoints: 5 attempts per 15 minutes
- Game endpoints: 60 requests per minute
- Transfer endpoints: 20 per hour

## API Architecture

RESTful API with the following endpoint groups:

- `/api/auth/*`: Authentication
- `/api/games/*`: Game operations
- `/api/balance`: User balance
- `/api/transfer`: Gem transfers
- `/api/admin/*`: Admin operations
- `/api/owner/*`: Owner operations

## Performance Considerations

### Database Optimization
- Connection pooling (20 connections)
- Strategic indexing on frequently queried columns
- Selective field queries

### Application Optimization
- Code splitting for heavy components
- Lazy loading
- Image optimization
- SWR caching strategy

### Server Optimization
- PM2 cluster mode
- Nginx reverse proxy
- Gzip compression
- CDN for static assets

## Monitoring & Logging

### Application Logs
- PM2 process management
- Error tracking
- Admin action logs

### Database Monitoring
- Query performance tracking
- Connection pool monitoring
- Database size monitoring

## Deployment Options

1. **Vercel** (Recommended): Automatic deployments with edge network
2. **Self-hosted**: Docker Compose or traditional server setup
3. **Cloud Platforms**: AWS, GCP, Azure

## Scalability

The architecture supports horizontal scaling:

- Stateless application servers
- Database connection pooling
- Session storage can use Redis
- Static assets on CDN

## Legal Compliance

- Age verification (13+)
- Responsible gaming features
- Privacy protection (GDPR-ready)
- Clear terms of service
- No real-money gambling

For detailed information on specific topics, see:
- [Deployment Guide](./deployment.md)
- [Local Development](./local-dev.md)
- [Security Guide](./security.md)
