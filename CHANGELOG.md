# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation structure with architecture, deployment, security, and local development guides
- CI/CD workflows for automated testing and security scanning
- TypeScript type checking in CI pipeline
- npm audit security checks
- CodeQL security analysis
- Enhanced Prisma database scripts (`db:migrate:deploy`, `db:generate`, `typecheck`)
- `.editorconfig` for consistent code formatting across editors
- `.prettierrc` for code style consistency
- `Makefile` for common development workflows
- `CHANGELOG.md` for tracking project changes
- Troubleshooting guide in documentation

### Changed
- Migrated project from nested Kimi export folder to clean root structure
- Restructured documentation: split monolithic README into focused docs
- Updated `.gitignore` to exclude Next.js build artifacts and environment files
- Enhanced CI workflow with security audits and type checking

### Fixed
- TypeScript compilation errors blocking production builds
- Prisma JSON type assertions
- Array iteration issues for ES2015 target
- BigInt string conversions in formatGems calls
- Google Fonts import (removed due to network restrictions)
- Missing `@radix-ui/react-checkbox` dependency

### Security
- Added `.env.example` template (never commit `.env.local`)
- Configured security headers recommendations in documentation
- Added rate limiting guidance
- Documented input validation with Zod
- Added CodeQL security scanning workflow

## [1.0.0] - 2024-12-19

### Added
- Initial production-ready Next.js 14 application
- Three provably fair games: Mines, Plinko, and Crash
- Dynamic ownership system (first user becomes owner)
- Role-based access control (Owner, Admin, Player)
- Virtual economy with Gems and Crystals
- PostgreSQL database with Prisma ORM
- Docker and Docker Compose support
- Comprehensive authentication system with bcrypt

[Unreleased]: https://github.com/kieranhoath3-ui/gemverse-casino-automated/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/kieranhoath3-ui/gemverse-casino-automated/releases/tag/v1.0.0
