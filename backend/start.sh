#!/bin/bash
set -e

echo "=== STARTING ==="
python --version

echo "DATABASE_URL is set: $(if [ -n \"$DATABASE_URL\" ]; then echo 'yes'; else echo 'NO!'; fi)"

# Skip migrations on startup - run them manually when needed
# This prevents hanging on database locks during deploy
echo "Skipping migrations (run manually if needed)"

echo "Starting server on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
