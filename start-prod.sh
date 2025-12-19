#!/bin/sh
set -e

echo "Starting production server..."

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for database..."
  until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done
  echo "Database is ready!"
  
  # Run migrations
  echo "Running database migrations..."
  npx prisma migrate deploy
  
  echo "Migrations completed!"
fi

# Start Next.js production server
echo "Starting Next.js server..."
exec node server.js
