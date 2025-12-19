# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Security
- [ ] Generate strong secrets for `NEXTAUTH_SECRET` and `JWT_SECRET` (minimum 32 characters)
- [ ] Change default database password
- [ ] Set `NODE_ENV=production`
- [ ] Configure `OWNER_IP_WHITELIST` for additional security
- [ ] Review and update CORS settings if needed
- [ ] Ensure `.env.local` is in `.gitignore` and not committed

### Database
- [ ] Database backup strategy in place
- [ ] Test database connection from deployment environment
- [ ] Run `npx prisma migrate deploy` to apply migrations
- [ ] Seed database with initial owner account: `npx prisma db seed`
- [ ] Verify database has proper indexes
- [ ] Set up automated backups (daily recommended)

### Application
- [ ] Run `npm run build` locally to verify build succeeds
- [ ] Test production build locally: `npm run start`
- [ ] Run `npm run lint` and fix any errors
- [ ] Run `npm run typecheck` and fix any errors
- [ ] Verify all environment variables are set correctly

### Domain & SSL
- [ ] Domain DNS configured correctly
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] SSL certificate configured in Nginx/reverse proxy
- [ ] Test HTTPS redirects work properly

## Deployment Methods

### Option 1: Vercel (Easiest)

1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   git push origin main
   ```

2. **Configure Vercel**
   - Connect GitHub repository to Vercel
   - Set environment variables in Vercel dashboard:
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `JWT_SECRET`
     - `NEXTAUTH_URL`
   
3. **Deploy**
   - Vercel will automatically deploy on push to main
   - Or manually trigger deployment from Vercel dashboard

4. **Database Setup**
   - Use Vercel Postgres or external database
   - Run migrations: `vercel env pull` then `npx prisma migrate deploy`

### Option 2: Docker (Production-Ready)

1. **Prepare Environment**
   ```bash
   # Copy production environment template
   cp .env.production.example .env.production
   
   # Edit and fill in actual values
   nano .env.production
   ```

2. **Build and Deploy**
   ```bash
   # Build production images
   docker compose -f docker-compose.prod.yml build
   
   # Start services
   docker compose -f docker-compose.prod.yml up -d
   
   # Check logs
   docker compose -f docker-compose.prod.yml logs -f
   ```

3. **Verify Deployment**
   ```bash
   # Check services are running
   docker compose -f docker-compose.prod.yml ps
   
   # Test application
   curl http://localhost:3000
   ```

### Option 3: VPS with PM2

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Application Setup**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd gemverse-casino-automated
   
   # Install dependencies
   npm ci --only=production
   
   # Setup environment
   cp .env.production.example .env
   nano .env
   
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate deploy
   
   # Build application
   npm run build
   ```

3. **Start with PM2**
   ```bash
   # Start application
   pm2 start npm --name "gemverse-casino" -- start
   
   # Save PM2 configuration
   pm2 save
   
   # Setup PM2 to start on boot
   pm2 startup
   
   # Follow the command output instructions
   ```

4. **Setup Nginx**
   ```bash
   # Install Nginx
   sudo apt install -y nginx
   
   # Copy Nginx configuration
   sudo cp nginx.conf /etc/nginx/sites-available/gemverse-casino
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/gemverse-casino /etc/nginx/sites-enabled/
   
   # Test configuration
   sudo nginx -t
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

5. **Setup SSL with Let's Encrypt**
   ```bash
   # Install Certbot
   sudo apt install -y certbot python3-certbot-nginx
   
   # Obtain certificate
   sudo certbot --nginx -d your-domain.com
   
   # Test auto-renewal
   sudo certbot renew --dry-run
   ```

## Post-Deployment

### Verification
- [ ] Visit homepage and verify it loads
- [ ] Test user registration
- [ ] Test user login
- [ ] Test games functionality
- [ ] Verify admin/owner dashboards work
- [ ] Check database connection is working
- [ ] Test API endpoints respond correctly
- [ ] Verify SSL certificate is active (if applicable)

### Monitoring Setup
- [ ] Configure uptime monitoring (UptimeRobot, Better Uptime, etc.)
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure log aggregation
- [ ] Set up database monitoring
- [ ] Configure alerting for critical errors

### Security
- [ ] Run security audit: `npm audit`
- [ ] Enable firewall and configure rules
- [ ] Review server access logs
- [ ] Change default owner password from `owner123`
- [ ] Test rate limiting is working
- [ ] Verify security headers are set

### Backup Strategy
- [ ] Set up automated database backups
- [ ] Test backup restoration process
- [ ] Document backup locations
- [ ] Set up off-site backup storage

### Documentation
- [ ] Document deployment configuration
- [ ] Record environment variables (in secure location)
- [ ] Document server access credentials (in password manager)
- [ ] Create runbook for common operations
- [ ] Document rollback procedure

## Rollback Plan

If deployment fails or issues arise:

1. **Immediate Actions**
   ```bash
   # Stop services
   docker compose -f docker-compose.prod.yml down
   # Or for PM2
   pm2 stop gemverse-casino
   ```

2. **Restore Previous Version**
   ```bash
   # Revert to previous git commit
   git revert HEAD
   git push origin main
   
   # Or rollback in Vercel dashboard
   ```

3. **Database Rollback**
   ```bash
   # Restore from backup
   psql gemverse < backups/gemverse_YYYYMMDD.sql
   ```

## Maintenance

### Weekly
- [ ] Review application logs
- [ ] Check database size and performance
- [ ] Review error rates

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Review and rotate secrets if needed
- [ ] Test backup restoration
- [ ] Review access logs for suspicious activity

### Quarterly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Update documentation
- [ ] Review and update monitoring alerts

## Emergency Contacts

Document your team contacts:
- DevOps Lead: _______________
- Database Admin: _______________
- On-call Engineer: _______________
- Hosting Support: _______________

## Useful Commands

```bash
# Check application status
docker compose -f docker-compose.prod.yml ps
pm2 status

# View logs
docker compose -f docker-compose.prod.yml logs -f app
pm2 logs gemverse-casino

# Restart application
docker compose -f docker-compose.prod.yml restart app
pm2 restart gemverse-casino

# Database backup
docker exec -t gemverse-db pg_dump -U postgres gemverse > backup_$(date +%Y%m%d).sql

# Database restore
docker exec -i gemverse-db psql -U postgres gemverse < backup.sql

# Check database connections
docker exec -it gemverse-db psql -U postgres -d gemverse -c "SELECT count(*) FROM pg_stat_activity;"
```
