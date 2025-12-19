# Troubleshooting Guide

Common issues and their solutions for Gemverse Casino.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Errors](#build-errors)
- [Database Issues](#database-issues)
- [Runtime Errors](#runtime-errors)
- [Docker Issues](#docker-issues)
- [Authentication Problems](#authentication-problems)
- [Performance Issues](#performance-issues)

## Installation Issues

### `npm install` fails

**Problem**: Installation fails with dependency conflicts or network errors.

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete lock file and node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If issues persist, try with legacy peer deps
npm install --legacy-peer-deps
```

### Wrong Node.js version

**Problem**: Build fails with "Unsupported engine" error.

**Solution**:
```bash
# Check your Node.js version
node --version

# Should be 18.x or 20.x
# Install correct version using nvm
nvm install 18
nvm use 18
```

## Build Errors

### TypeScript errors during build

**Problem**: `npm run build` fails with TypeScript errors.

**Solutions**:

1. **Check TypeScript version**:
   ```bash
   npm list typescript
   # Should be 5.x
   ```

2. **Regenerate Prisma client**:
   ```bash
   npx prisma generate
   npm run build
   ```

3. **Check for type mismatches**:
   ```bash
   npm run typecheck
   # Review errors and fix type issues
   ```

### "Module not found" errors

**Problem**: Build fails with missing module errors.

**Solutions**:
```bash
# Verify all dependencies are installed
npm ci

# Check for missing peer dependencies
npm list --depth=0

# Install missing package
npm install <package-name>
```

### Next.js compilation errors

**Problem**: Next.js fails to compile with "Failed to compile" error.

**Solutions**:
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# If using Docker, rebuild without cache
docker compose build --no-cache
```

## Database Issues

### Cannot connect to PostgreSQL

**Problem**: Application fails to connect to database.

**Solutions**:

1. **Check PostgreSQL is running**:
   ```bash
   # Native installation
   pg_isready
   
   # Docker
   docker compose ps
   ```

2. **Verify connection string**:
   ```bash
   # Check .env file
   cat .env | grep DATABASE_URL
   
   # Format: postgresql://user:password@host:port/database
   ```

3. **Test connection manually**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. **Check firewall/network**:
   ```bash
   # Test port connectivity
   telnet localhost 5432
   # Or
   nc -zv localhost 5432
   ```

### Prisma migration errors

**Problem**: `prisma migrate` fails.

**Solutions**:

1. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

2. **Reset database (CAUTION: deletes all data)**:
   ```bash
   npx prisma migrate reset
   ```

3. **Manual migration**:
   ```bash
   # Mark migration as applied without running
   npx prisma migrate resolve --applied <migration_name>
   ```

4. **Fix drift**:
   ```bash
   npx prisma migrate diff
   npx prisma db push
   ```

### "Table does not exist" errors

**Problem**: Queries fail with missing table errors.

**Solutions**:
```bash
# Run migrations
npx prisma migrate deploy

# Or push schema to database
npx prisma db push

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

## Runtime Errors

### Session/Authentication errors

**Problem**: Users can't log in or sessions expire immediately.

**Solutions**:

1. **Check secrets are set**:
   ```bash
   # Verify environment variables
   echo $NEXTAUTH_SECRET
   echo $JWT_SECRET
   
   # Generate new secrets if needed
   openssl rand -base64 32
   ```

2. **Clear sessions table**:
   ```sql
   DELETE FROM sessions WHERE expires < NOW();
   ```

3. **Check system time**:
   ```bash
   date
   # Should match actual time
   ```

### "Owner privileges required" errors

**Problem**: Owner account cannot access owner features.

**Solutions**:

1. **Verify role in database**:
   ```sql
   SELECT user_id, username, role FROM users WHERE role = 'OWNER';
   ```

2. **Check session validity**:
   ```sql
   SELECT * FROM sessions WHERE user_id = <owner_user_id>;
   ```

3. **Re-login**:
   - Clear browser cookies
   - Log out and log back in

### API route errors (500/404)

**Problem**: API calls fail with server errors.

**Solutions**:

1. **Check server logs**:
   ```bash
   # Development
   npm run dev
   # Watch console output
   
   # Docker
   docker compose logs -f app
   ```

2. **Verify route exists**:
   ```bash
   # List all API routes
   find src/app/api -name "route.ts"
   ```

3. **Test endpoint directly**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

## Docker Issues

### Container fails to start

**Problem**: `docker compose up` fails or container crashes.

**Solutions**:

1. **Check logs**:
   ```bash
   docker compose logs app
   docker compose logs db
   ```

2. **Verify environment variables**:
   ```bash
   docker compose config
   ```

3. **Rebuild containers**:
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up
   ```

### Database container issues

**Problem**: PostgreSQL container won't start.

**Solutions**:

1. **Check port availability**:
   ```bash
   lsof -i :5432
   # If port is in use, stop conflicting service
   ```

2. **Remove old volumes**:
   ```bash
   docker compose down -v
   docker volume ls
   docker volume rm <volume_name>
   ```

3. **Check disk space**:
   ```bash
   df -h
   docker system df
   ```

### Cannot connect to database from host

**Problem**: Can't connect to PostgreSQL running in Docker from host machine.

**Solutions**:

1. **Verify port mapping**:
   ```bash
   docker compose ps
   # Should show 0.0.0.0:5432->5432/tcp
   ```

2. **Use correct host**:
   ```bash
   # From host machine: use localhost
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gemverse
   
   # From inside Docker: use service name
   DATABASE_URL=postgresql://postgres:postgres@db:5432/gemverse
   ```

## Authentication Problems

### Password validation fails

**Problem**: Can't register with valid password.

**Solutions**:

1. **Check password requirements**:
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and number
   
2. **Try a simple test password**:
   ```
   Password123
   ```

### "Invalid credentials" on login

**Problem**: Correct password doesn't work.

**Solutions**:

1. **Verify user exists**:
   ```sql
   SELECT username, role, is_banned FROM users WHERE username = '<username>';
   ```

2. **Check if banned**:
   ```sql
   SELECT is_banned, mute_until FROM users WHERE username = '<username>';
   ```

3. **Reset password (owner only)**:
   ```sql
   -- Generate hash for "newpassword123"
   -- Then update:
   UPDATE users SET password_hash = '<new_hash>' WHERE username = '<username>';
   ```

## Performance Issues

### Slow page loads

**Problem**: Application is sluggish.

**Solutions**:

1. **Check database connections**:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   -- Should be < 20
   ```

2. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run build
   ```

3. **Monitor memory**:
   ```bash
   # Check Node.js memory
   node --max-old-space-size=4096 node_modules/.bin/next dev
   ```

### Database query slow

**Problem**: Queries take too long.

**Solutions**:

1. **Check for missing indexes**:
   ```sql
   -- View table indexes
   \d+ users
   \d+ bets
   ```

2. **Analyze tables**:
   ```sql
   ANALYZE users;
   ANALYZE bets;
   ANALYZE sessions;
   ```

3. **Vacuum database**:
   ```bash
   psql $DATABASE_URL -c "VACUUM ANALYZE"
   ```

### High memory usage

**Problem**: Application uses too much RAM.

**Solutions**:

1. **Reduce connection pool**:
   Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Add connection limit
   }
   ```

2. **Optimize queries**:
   - Use `select` to fetch only needed fields
   - Add pagination with `skip` and `take`
   - Use `findMany` with limits

3. **Restart application**:
   ```bash
   # Docker
   docker compose restart app
   
   # PM2
   pm2 restart gemverse-casino
   ```

## Getting More Help

If issues persist:

1. **Check logs**:
   - Browser console (F12)
   - Server console output
   - Docker logs: `docker compose logs -f`

2. **Enable debug mode**:
   ```bash
   DEBUG=* npm run dev
   ```

3. **Search existing issues**:
   - Check GitHub issues
   - Review error messages carefully

4. **Create a new issue**:
   - Include error messages
   - Provide steps to reproduce
   - Share relevant logs (without secrets!)
   - Specify environment (OS, Node version, etc.)

## Quick Diagnostics

Run these commands to gather diagnostic info:

```bash
# System info
node --version
npm --version
docker --version
docker compose version

# Check services
pg_isready
docker compose ps

# Database status
npx prisma migrate status

# Project status
npm run typecheck
npm run lint

# Network test
curl http://localhost:3000/api/health || echo "Server not responding"
```

Save this output when reporting issues!
