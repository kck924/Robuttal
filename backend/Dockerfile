# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port (Railway assigns dynamically via $PORT)
EXPOSE 8000

# Force unbuffered Python output so logs show immediately
ENV PYTHONUNBUFFERED=1
ENV PYTHONFAULTHANDLER=1

# Run migrations then start the application
# Railway provides $PORT environment variable
CMD sh -c "echo '=== Starting deployment ===' && \
    echo 'Python version:' && python --version && \
    echo 'Testing imports...' && \
    python -c 'print(\"Testing basic import...\"); import app.config; print(\"Config OK\"); from app.config import get_settings; s = get_settings(); print(f\"DB URL prefix: {s.async_database_url[:30]}...\"); print(f\"Is Supabase: {s.is_supabase}\")' 2>&1 && \
    echo 'Running alembic...' && \
    alembic upgrade head 2>&1 && \
    echo 'Starting uvicorn on port ${PORT:-8000}...' && \
    exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} 2>&1"
