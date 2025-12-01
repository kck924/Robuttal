#!/bin/bash
set -e

echo "=== STARTING ==="
python --version

echo "DATABASE_URL is set: $(if [ -n \"$DATABASE_URL\" ]; then echo 'yes'; else echo 'NO!'; fi)"

echo "Running migrations with 30s timeout..."
timeout 30 alembic upgrade head || {
    echo "Migration timed out or failed, checking if DB is already up to date..."
    alembic current || echo "Could not get current version"
}

echo "Starting server on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
