#!/bin/bash
set -e

echo "=== STARTING ==="
python --version

echo "DATABASE_URL is set: $(if [ -n \"$DATABASE_URL\" ]; then echo 'yes'; else echo 'NO!'; fi)"

# Run migrations (they should be fast if already up to date)
echo "Running migrations..."
alembic upgrade head && echo "Migrations complete" || {
    echo "Migration failed, checking current state..."
    alembic current || echo "Could not get current version"
    echo "Continuing anyway..."
}

echo "Starting server on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
