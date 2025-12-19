# Gemverse Casino

A modern, free-to-play casino gaming platform built with Next.js 14, TypeScript, and PostgreSQL. Features provably fair games, dynamic ownership system, and comprehensive admin controls.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)

## 🎮 Features

- **Three Provably Fair Games**: Mines, Plinko, and Crash
- **Dynamic Ownership**: First registered user becomes owner
- **Role-Based Access Control**: Owner, Admin, and Player roles
- **Virtual Economy**: Gem-based currency with no real-money value
- **Level System**: XP progression and rewards
- **Admin Dashboard**: User management and system controls
- **Real-time Updates**: Live game statistics and notifications
- **Responsive Design**: Mobile-friendly interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gemverse-casino-automated
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/gemverse
   NEXTAUTH_SECRET=your-secret-here
   JWT_SECRET=your-jwt-secret-here
   ```

4. **Set up database**
   ```bash
   createdb gemverse
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Using Docker

Alternatively, use Docker Compose for a complete setup:

```bash
docker compose up --build
```

This starts PostgreSQL and the Next.js application. Access at [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages and API
│   │   ├── api/         # REST API endpoints
│   │   ├── games/       # Game pages (Mines, Plinko, Crash)
│   │   ├── admin/       # Admin dashboard
│   │   └── owner/       # Owner control panel
│   ├── components/       # Reusable React components
│   │   ├── ui/          # UI components (buttons, cards, etc.)
│   │   ├── providers/   # Context providers
│   │   └── modals/      # Dialog components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utility functions and helpers
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding script
├── public/              # Static assets
├── docs/                # Documentation
│   ├── architecture.md  # System architecture
│   ├── deployment.md    # Deployment guide
│   ├── local-dev.md     # Development guide
│   └── security.md      # Security guidelines
├── docker-compose.yml   # Docker orchestration
├── Dockerfile           # Container definition
└── package.json         # Dependencies and scripts
```

## 🎯 Key Concepts

### Dynamic Ownership

The first user to register automatically becomes the **OWNER** with full system privileges. The owner can transfer ownership to any other user through a secure process.

### Role Hierarchy

1. **OWNER**: Full control, can transfer ownership
2. **ADMIN**: User management and moderation
3. **PLAYER**: Game access and standard features

### Virtual Economy

- **Gems**: Primary virtual currency (no real-world value)
- **Crystals**: Secondary currency for special features
- **Levels**: XP-based progression system
- **Daily Faucet**: Free gems for active users

### Provably Fair Gaming

All games use cryptographic algorithms to ensure fairness:
- Server seed + client nonce = provable outcomes
- Hash verification available
- Transparent game mechanics

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database commands
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
npm run db:migrate   # Run migrations
```

## 🔐 Security

- **Password Hashing**: bcrypt with 12 rounds
- **Session Management**: JWT-based authentication
- **Input Validation**: Comprehensive sanitization
- **Rate Limiting**: API abuse prevention
- **RBAC**: Role-based access control
- **Audit Logs**: All admin actions logged

See [Security Guide](./docs/security.md) for details.

## 📚 Documentation

- [**Architecture Overview**](./docs/architecture.md) - System design and technology stack
- [**Local Development**](./docs/local-dev.md) - Complete development setup guide
- [**Deployment Guide**](./docs/deployment.md) - Production deployment instructions
- [**Security Guidelines**](./docs/security.md) - Security best practices

## 🐳 Docker Deployment

### Development

```bash
docker compose up
```

### Production

1. Update environment variables in `docker-compose.yml`
2. Use production-ready secrets
3. Enable SSL/TLS
4. Configure reverse proxy (Nginx)

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NODE_ENV` | Environment mode | No |

Generate secrets:
```bash
openssl rand -base64 32
```

## 🎮 Games

### Mines
Strategic grid game where players uncover gems while avoiding mines. Features:
- Configurable grid size (3x3 to 8x8)
- Variable mine count
- Progressive multipliers
- Cashout anytime

### Plinko
Physics-based ball drop game. Features:
- Multiple risk levels (Low, Medium, High)
- Configurable rows (8-16)
- Real physics simulation
- Variable multipliers

### Crash
Multiplayer multiplier game. Features:
- Real-time multiplayer
- Exponential multiplier growth
- Cashout before crash
- Historical data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is provided as-is for educational and entertainment purposes. No real-money gambling is involved.

## ⚠️ Disclaimer

**This is a free-to-play simulation platform.** 

- No real money is involved
- Gems have no monetary value
- Intended for entertainment only
- Must be 13+ to use
- Responsible gaming features included

## 🆘 Support

- **Documentation**: Check the [docs](./docs/) folder
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions

## 🌟 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Framer Motion](https://www.framer.com/motion/)

---

**Made with ❤️ for the gaming community**
