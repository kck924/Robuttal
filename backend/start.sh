#!/bin/bash
set -e

echo "=== STARTING ==="
python --version

echo "Running migrations..."
alembic upgrade head

echo "Starting server on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
