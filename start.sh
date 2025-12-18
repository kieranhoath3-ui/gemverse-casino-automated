#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
until pg_isready -h db -p 5432; do
  echo "Waiting for database..."
  sleep 2
done

# Run Prisma migrations
npx prisma migrate deploy

# Start the Next.js development server
npm run dev
