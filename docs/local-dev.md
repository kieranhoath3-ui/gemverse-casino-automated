# Local Development Guide

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 14+** ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))
- **npm** or **yarn** (comes with Node.js)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gemverse-casino-automated
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, Prisma, and all dependencies.

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/gemverse?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
JWT_SECRET=your-jwt-secret-here
NODE_ENV=development
```

**Generate secure secrets:**
```bash
# For NEXTAUTH_SECRET
openssl rand -base64 32

# For JWT_SECRET
openssl rand -base64 32
```

### 4. Set Up Database

Create the PostgreSQL database:

```bash
createdb gemverse
```

Or using psql:
```sql
CREATE DATABASE gemverse;
```

Run Prisma migrations:

```bash
npx prisma migrate dev
```

(Optional) Seed the database with initial data:

```bash
npx prisma db seed
```

This creates an initial owner account:
- Username: `owner`
- Password: `owner123`

**⚠️ Change this password immediately after first login!**

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **App**: http://localhost:3000
- **API**: http://localhost:3000/api

## Using Docker (Alternative)

If you prefer using Docker, you can run the entire stack:

### 1. Start Services

```bash
docker compose up --build
```

This will:
- Start PostgreSQL on port 5432
- Start the Next.js app on port 3000
- Automatically run migrations
- Mount your code for live reloading

### 2. Access the Application

- **App**: http://localhost:3000
- **Database**: localhost:5432

### 3. Stop Services

```bash
docker compose down
```

To also remove volumes (database data):
```bash
docker compose down -v
```

## Development Workflow

### File Structure

```
├── src/
│   ├── app/              # Pages and API routes
│   ├── components/       # React components
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilities
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── public/              # Static assets
├── docs/                # Documentation
└── package.json         # Dependencies
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run lint             # Run ESLint
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
npm run db:migrate       # Run migrations
```

### Database Management

#### Prisma Studio

Open a visual database editor:

```bash
npm run db:studio
```

Access at http://localhost:5555

#### Create Migration

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

#### Reset Database

**⚠️ Warning: This deletes all data!**

```bash
npx prisma migrate reset
```

### Code Style

The project uses ESLint and Prettier:

```bash
# Check code style
npm run lint

# Fix automatically
npm run lint -- --fix
```

### Hot Reloading

The development server supports hot module replacement (HMR):
- Changes to `.tsx`, `.ts`, `.css` files reload automatically
- API route changes may require manual refresh
- Database schema changes require migration

## Debugging

### VS Code Setup

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
    }
  ]
}
```

### Chrome DevTools

1. Start dev server with inspect:
   ```bash
   node --inspect node_modules/.bin/next dev
   ```

2. Open `chrome://inspect` in Chrome
3. Click "Open dedicated DevTools for Node"

### Database Debugging

View SQL queries in development:

Edit `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

## Common Issues

### Port Already in Use

If port 3000 is busy:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Database Connection Error

1. Check PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify credentials in `.env`
3. Ensure database exists:
   ```bash
   psql -l | grep gemverse
   ```

### Migration Errors

If migrations fail:

```bash
# Reset and reapply
npx prisma migrate reset

# Force push schema (dev only)
npx prisma db push --force-reset
```

### Module Not Found

Clear cache and reinstall:

```bash
rm -rf .next node_modules package-lock.json
npm install
```

## Testing

### Manual Testing

1. **Registration Flow**
   - Visit http://localhost:3000/register
   - Create test accounts

2. **Game Testing**
   - Access games at `/games/mines`, `/games/plinko`, `/games/crash`
   - Test betting and cashout

3. **Admin Features**
   - Login as owner
   - Test user management at `/owner`
   - Test admin features at `/admin`

### API Testing

Use tools like Postman or curl:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!@#"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!@#"}'
```

## Performance Tips

### Development Mode
- Uses unoptimized builds
- Includes source maps
- Shows detailed errors
- Slower than production

### Optimize Development
```bash
# Use SWC compiler (faster)
npm run dev -- --turbo

# Reduce memory usage
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## Next Steps

- Read [Architecture Guide](./architecture.md) to understand the system
- Review [Deployment Guide](./deployment.md) for production setup
- Check [Security Guide](./security.md) for best practices

## Getting Help

- Check console logs in browser DevTools
- Review server logs in terminal
- Check database with Prisma Studio
- Search issues in the repository
