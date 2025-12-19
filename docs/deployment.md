# Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Local Development

1. **Clone and Setup**
   ```bash
   cd /mnt/okcomputer/output/gemverse-casino
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create PostgreSQL database named 'gemverse'
   createdb gemverse
   
   # Run migrations
   npx prisma migrate dev --name init
   
   # Seed database with owner account
   npx prisma db seed
   ```

3. **Environment Variables**
   Create `.env` file:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/gemverse"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   JWT_SECRET="your-jwt-secret-here"
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Main app: http://localhost:3000
   - Owner login: username `owner`, password `owner123`

### Production Deployment

#### Option 1: Vercel (Recommended)

1. **Prepare for Deployment**
   ```bash
   # Build project
   npm run build
   
   # Test production build
   npm start
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push to main branch

3. **Database Setup**
   - Use Vercel PostgreSQL or connect external database
   - Run migrations: `npx prisma migrate deploy`

#### Option 2: Self-hosted

1. **Build Project**
   ```bash
   npm run build
   ```

2. **PM2 Setup**
   ```bash
   npm install -g pm2
   pm2 start npm --name "gemverse-casino" -- start
   pm2 save
   pm2 startup
   ```

3. **Nginx Configuration**
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
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **SSL Setup**
   ```bash
   certbot --nginx -d your-domain.com
   ```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/gemverse` |
| `NEXTAUTH_URL` | Application URL | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | NextAuth secret key | Generate with `openssl rand -base64 32` |
| `JWT_SECRET` | JWT signing secret | Generate with `openssl rand -base64 32` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OWNER_IP_WHITELIST` | Comma-separated IP addresses for owner access | `""` (disabled) |
| `NODE_ENV` | Environment mode | `development` |

## Database Management

### Backup Database
```bash
pg_dump gemverse > backup.sql
```

### Restore Database
```bash
psql gemverse < backup.sql
```

### Reset Database
```bash
npx prisma migrate reset
npx prisma db seed
```

## Monitoring

### Application Logs
```bash
# PM2 logs
pm2 logs gemverse-casino

# System logs
journalctl -u gemverse-casino -f
```

### Database Monitoring
```bash
# Check active connections
psql -d gemverse -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -d gemverse -c "SELECT pg_size_pretty(pg_database_size('gemverse'));"
```

## Security Checklist

- [ ] Change default owner password
- [ ] Generate strong secrets for environment variables
- [ ] Enable IP whitelist for owner dashboard (production)
- [ ] Use HTTPS in production
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor admin logs
- [ ] Rate limiting (cloud provider or nginx)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify connection string in `.env`
   - Check firewall settings

2. **Build Fails**
   - Clear cache: `rm -rf .next node_modules`
   - Reinstall: `npm install`
   - Check Node.js version (18+)

3. **Session Issues**
   - Clear browser cookies
   - Check JWT_SECRET is set
   - Verify server time is correct

4. **Permission Denied**
   - Check user role in database
   - Verify session is valid
   - Check IP whitelist if enabled

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## Performance Optimization

1. **Database**
   - Add indexes for frequently queried columns
   - Use connection pooling
   - Regular VACUUM and ANALYZE

2. **Application**
   - Enable Next.js caching
   - Use CDN for static assets
   - Implement rate limiting

3. **Monitoring**
   - Set up application monitoring (e.g., Sentry)
   - Database performance monitoring
   - Uptime monitoring

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Check admin logs for errors
4. Consult the main README.md