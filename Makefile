.PHONY: help install dev build start lint typecheck test clean db-setup db-migrate db-studio db-seed docker-up docker-down docker-clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make dev           - Start development server"
	@echo "  make build         - Build production bundle"
	@echo "  make start         - Start production server"
	@echo "  make lint          - Run ESLint"
	@echo "  make typecheck     - Run TypeScript type checking"
	@echo "  make test          - Run all checks (lint + typecheck + build)"
	@echo "  make clean         - Remove build artifacts and dependencies"
	@echo "  make db-setup      - Setup database (generate + migrate)"
	@echo "  make db-migrate    - Run database migrations"
	@echo "  make db-studio     - Open Prisma Studio"
	@echo "  make db-seed       - Seed database with initial data"
	@echo "  make docker-up     - Start Docker containers"
	@echo "  make docker-down   - Stop Docker containers"
	@echo "  make docker-clean  - Stop and remove Docker containers and volumes"

# Installation
install:
	npm ci

# Development
dev:
	npm run dev

# Build
build:
	npm run build

# Production
start:
	npm run start

# Linting and checking
lint:
	npm run lint

typecheck:
	npm run typecheck

test: lint typecheck build
	@echo "✅ All checks passed!"

# Database operations
db-setup:
	npx prisma generate
	npx prisma migrate dev

db-migrate:
	npx prisma migrate dev

db-migrate-deploy:
	npx prisma migrate deploy

db-studio:
	npm run db:studio

db-seed:
	npm run db:seed

# Docker operations
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-clean:
	docker compose down -v
	docker system prune -f

# Cleanup
clean:
	rm -rf .next
	rm -rf node_modules
	rm -rf dist
	rm -f package-lock.json
