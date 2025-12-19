# Security Guide

## Overview

This document outlines the security measures implemented in Gemverse Casino and best practices for maintaining a secure deployment.

## Authentication & Authorization

### Password Security

**Hashing Algorithm**: bcrypt with 12 rounds
- Passwords are never stored in plain text
- Salt is generated automatically per password
- Rainbow table attacks are prevented

**Password Requirements**:
- Minimum 8 characters
- Maximum 128 characters
- Must contain: uppercase, lowercase, and number

**Best Practices**:
- Never log passwords
- Use environment variables for secrets
- Rotate secrets regularly

### Session Management

**Session Token**: UUID v4 (cryptographically secure)
- 24-hour expiration
- Stored in database with user association
- Automatically cleaned up on expiry

**Session Security**:
- HTTPOnly cookies (recommended in production)
- Secure flag in production (HTTPS only)
- SameSite attribute to prevent CSRF
- Automatic logout on session expiry

### Role-Based Access Control (RBAC)

**Three Role Levels**:
1. **PLAYER**: Default role, game access only
2. **ADMIN**: User management and moderation
3. **OWNER**: Full system access

**Permission Enforcement**:
- Checked on every API request
- Server-side validation (never trust client)
- Audit trail for all admin actions

## Input Validation & Sanitization

### API Input Validation

All API endpoints validate input:
- Type checking (TypeScript)
- Range validation
- Format validation (email, username patterns)
- SQL injection prevention (Prisma parameterized queries)

**Example Validations**:
```typescript
// Username validation
username: z.string()
  .min(3, "Too short")
  .max(30, "Too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid characters")

// Bet amount validation
amount: z.number()
  .positive("Must be positive")
  .int("Must be integer")
  .max(1000000, "Too large")
```

### XSS Protection

**Measures**:
- React automatically escapes output
- Sanitize HTML if needed (use DOMPurify)
- Content Security Policy headers
- No `dangerouslySetInnerHTML` without sanitization

### SQL Injection Prevention

**Prisma ORM**:
- Parameterized queries by default
- No string concatenation in queries
- Type-safe database operations

**Raw Queries** (when needed):
```typescript
// ❌ NEVER DO THIS
await prisma.$executeRawUnsafe(`SELECT * FROM users WHERE id = ${id}`)

// ✅ DO THIS
await prisma.$executeRaw`SELECT * FROM users WHERE id = ${id}`
```

## Environment Variables & Secrets

### Required Secrets

Store in `.env` (never commit):

```env
DATABASE_URL=postgresql://user:password@host:5432/db
NEXTAUTH_SECRET=<32+ character random string>
JWT_SECRET=<32+ character random string>
```

### Secret Generation

```bash
# Generate secure random strings
openssl rand -base64 32
```

### Secret Management

**Development**:
- Use `.env.local` (in .gitignore)
- Never commit `.env` files with real secrets

**Production**:
- Use environment variables (not files)
- Use secret management services:
  - Vercel: Environment Variables
  - AWS: Secrets Manager
  - Azure: Key Vault
  - Docker: Secrets

**Secret Rotation**:
- Rotate secrets every 90 days
- Immediate rotation if compromised
- Update all instances simultaneously

## Database Security

### Connection Security

**Connection String Security**:
- Never log connection strings
- Use environment variables only
- Encrypt connections (SSL/TLS in production)

**Connection Pooling**:
- Limit maximum connections (20)
- Timeout idle connections
- Monitor connection usage

### Data Protection

**Sensitive Data**:
- Password hashes only (never plain text)
- Email addresses (optional, can be null)
- No personally identifiable information (PII) unless necessary

**Data Encryption**:
- Passwords: bcrypt hashing
- Sessions: secure tokens
- Database: PostgreSQL encryption at rest (configure in DB)

### Backup Security

**Regular Backups**:
```bash
# Automated daily backups
pg_dump gemverse > backup_$(date +%Y%m%d).sql
```

**Backup Storage**:
- Encrypted storage
- Off-site backups
- Access control
- Retention policy (30 days)

## Rate Limiting

### API Rate Limits

Prevent abuse with rate limiting:

**Authentication Endpoints**:
- 5 attempts per 15 minutes per IP
- Prevents brute force attacks

**Game Endpoints**:
- 60 requests per minute per user
- Prevents rapid betting abuse

**Transfer Endpoints**:
- 20 transfers per hour per user
- Prevents automated transfer abuse

### Implementation

```typescript
// Middleware for rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
  message: "Too many requests"
});
```

## Network Security

### HTTPS/TLS

**Production Requirements**:
- Always use HTTPS
- Minimum TLS 1.2
- Valid SSL certificate
- Redirect HTTP to HTTPS

**Setup**:
```bash
# Using Let's Encrypt
certbot --nginx -d your-domain.com
```

### Security Headers

**Recommended Headers**:
```nginx
# Nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### CORS Configuration

Restrict API access:
```typescript
// Only allow requests from your domain
const allowedOrigins = ['https://your-domain.com'];
```

## Monitoring & Logging

### Security Logging

**Log Security Events**:
- Failed login attempts
- Permission denied errors
- Role changes
- Ownership transfers
- Database access (owner only)

**Admin Action Logs**:
```typescript
await prisma.adminLog.create({
  data: {
    admin_id: userId,
    action: "BAN_USER",
    target_id: targetUserId,
    details: { reason: "Violation" }
  }
});
```

### Monitoring

**Watch For**:
- Repeated failed logins (brute force)
- Unusual gem transfers (fraud)
- Rapid API requests (abuse)
- Database connection spikes
- Unauthorized access attempts

**Alerts**:
- Email notifications for critical events
- Log aggregation (Sentry, LogRocket)
- Real-time monitoring dashboards

## Dependency Security

### Keep Dependencies Updated

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Update dependencies
npm update
```

### Dependency Review

- Review new dependencies before adding
- Check package reputation (downloads, stars)
- Avoid packages with known vulnerabilities
- Use lock files (`package-lock.json`)

## Deployment Security

### Production Checklist

- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/TLS
- [ ] Set secure session cookies
- [ ] Configure security headers
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Use strong database passwords
- [ ] Restrict database access (not public)
- [ ] Enable PostgreSQL SSL
- [ ] Regular backups
- [ ] Log monitoring
- [ ] Update dependencies

### Infrastructure Security

**Firewall Rules**:
```bash
# Only allow necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw deny 5432   # PostgreSQL (only internal access)
```

**Database Access**:
- Not exposed to internet
- Only accessible from application server
- Strong passwords
- Limited user permissions

### Docker Security

**Best Practices**:
- Use official Node.js image
- Don't run as root
- Scan images for vulnerabilities
- Use specific versions (not `latest`)
- Limit container resources

```dockerfile
# Use specific version
FROM node:18-slim

# Don't run as root
USER node
```

## Responsible Gaming & Legal

### Age Verification

- Require users to confirm they are 13+
- Log verification (IP, timestamp)
- No real-money gambling

### Privacy Protection

**Data Minimization**:
- Collect only necessary data
- Email is optional
- No tracking without consent

**User Rights**:
- Data export capability
- Account deletion
- Privacy policy acceptance

## Incident Response

### Security Incident Plan

**If a breach is detected**:

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Inform affected users
4. **Remediate**: Fix vulnerability
5. **Document**: Write incident report
6. **Learn**: Update security measures

### Emergency Contacts

Maintain list of:
- System administrators
- Database administrators
- Hosting provider support
- Security team (if applicable)

## Security Audits

### Regular Reviews

**Weekly**:
- Check failed login logs
- Review admin action logs
- Monitor error rates

**Monthly**:
- Dependency vulnerability scan
- Review access logs
- Check backup integrity

**Quarterly**:
- Full security audit
- Penetration testing (if possible)
- Update security documentation

## Resources

### Security Tools

- **npm audit**: Dependency vulnerabilities
- **OWASP ZAP**: Web application security
- **Snyk**: Dependency monitoring
- **SSL Labs**: SSL/TLS testing

### Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/authentication)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

## Contact

For security issues:
- **DO NOT** open public issues
- Email: security@your-domain.com (if available)
- Use responsible disclosure
