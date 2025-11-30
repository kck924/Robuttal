# Robuttal Deployment Guide

This guide covers deploying Robuttal to production using Railway/Render for the backend and Vercel for the frontend.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Vercel        │────▶│   Railway/      │────▶│   Supabase      │
│   (Frontend)    │     │   Render (API)  │     │   (PostgreSQL)  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Prerequisites

- GitHub account
- Vercel account (https://vercel.com)
- Railway (https://railway.app) or Render (https://render.com) account
- Supabase account (https://supabase.com)
- Google Cloud Console account for OAuth
- API keys for AI providers (Anthropic, OpenAI, Google, Mistral)

---

## 1. Database Setup (Supabase)

### Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project reference (e.g., `abcdefghijk`)
3. Set a secure database password

### Get Connection String

1. Go to **Settings** → **Database**
2. Under **Connection string**, select **URI**
3. Copy the connection string
4. Modify for SQLAlchemy:
   - Change `postgres://` to `postgresql+asyncpg://`
   - Replace `[YOUR-PASSWORD]` with your actual password

Example:
```
postgresql+asyncpg://postgres.abcdefghijk:YourPassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Enable Connection Pooling (Recommended)

1. Go to **Settings** → **Database** → **Connection Pooling**
2. Enable connection pooling
3. Use the **Pooler** connection string for production

---

## 2. Google OAuth Setup

### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**

### Configure OAuth Client

**Authorized JavaScript origins:**
```
http://localhost:3000
https://your-app.vercel.app
https://www.yourdomain.com
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
https://your-app.vercel.app/api/auth/callback/google
https://www.yourdomain.com/api/auth/callback/google
```

6. Copy the **Client ID** and **Client Secret**

---

## 3. Backend Deployment

### Option A: Railway

#### Deploy via GitHub

1. Connect your GitHub repository to Railway
2. Select the `backend` directory as the root
3. Railway will auto-detect the Dockerfile

#### Set Environment Variables

In Railway dashboard → **Variables**:

```env
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://... (from Supabase)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
ALLOWED_ORIGINS=https://your-app.vercel.app
```

#### Configure Domain

1. Go to **Settings** → **Networking**
2. Generate a Railway domain or add custom domain
3. Note the URL for frontend configuration

### Option B: Render

#### Deploy via Blueprint

1. Fork the repository to your GitHub
2. In Render dashboard, click **New** → **Blueprint**
3. Connect your repository
4. Render will use `render.yaml` configuration

#### Manual Deploy

1. Click **New** → **Web Service**
2. Connect repository, select `backend` directory
3. Set:
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`

#### Set Environment Variables

Same as Railway variables above.

---

## 4. Frontend Deployment (Vercel)

### Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`
5. Framework will be auto-detected as Next.js

### Set Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**:

```env
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

**Note:** `NEXTAUTH_URL` is automatically set by Vercel based on your deployment URL.

### Configure Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update Google OAuth redirect URIs

---

## 5. Post-Deployment

### Run Database Migrations

Migrations run automatically on deploy. To run manually:

```bash
# SSH into Railway/Render shell, or run locally with production DATABASE_URL
alembic upgrade head
```

### Seed Initial Data

```bash
# Load AI models
python scripts/seed_models.py

# Load seed topics (optional)
python scripts/load_seed_topics.py --input data/seed_topics.json
```

### Verify Deployment

1. Check backend health: `https://your-api.railway.app/`
2. Check frontend loads: `https://your-app.vercel.app`
3. Test Google sign-in
4. Submit a test topic

---

## 6. Monitoring & Maintenance

### Logs

- **Railway**: Dashboard → Deployments → View Logs
- **Render**: Dashboard → Service → Logs
- **Vercel**: Dashboard → Deployments → Functions

### Database Backups

Supabase provides automatic daily backups. For manual backups:
1. Go to **Database** → **Backups**
2. Create manual backup before major changes

### Scaling

- **Railway**: Adjust resources in Settings → General
- **Render**: Upgrade plan or add instances
- **Vercel**: Automatic scaling for frontend

---

## Environment Variables Reference

### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql+asyncpg://...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `GOOGLE_API_KEY` | Google AI API key | `AIza...` |
| `MISTRAL_API_KEY` | Mistral API key | `...` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://app.com` |
| `TOPIC_SELECTION_MODE` | Topic selection strategy | `hybrid` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | NextAuth base URL | Auto-set by Vercel |
| `NEXTAUTH_SECRET` | Session encryption key | `<random 32+ chars>` |
| `GOOGLE_CLIENT_ID` | OAuth client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | `GOCSPX-...` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.railway.app` |

---

## Troubleshooting

### Database Connection Issues

- Verify connection string format (`postgresql+asyncpg://`)
- Check Supabase connection pooling is enabled
- Ensure IP allowlist includes deployment servers (or allow all: `0.0.0.0/0`)

### OAuth Errors

- Verify redirect URIs match exactly (including trailing slashes)
- Check `NEXTAUTH_URL` matches your deployment URL
- Ensure `NEXTAUTH_SECRET` is set

### CORS Errors

- Add your frontend URL to `ALLOWED_ORIGINS`
- Include both `https://` and `https://www.` variants
- Restart backend after changing environment variables

### Build Failures

- Check Node.js version matches (18+)
- Verify all environment variables are set
- Review build logs for missing dependencies

---

## Security Checklist

- [ ] All API keys stored as environment variables
- [ ] `NEXTAUTH_SECRET` is a strong random string
- [ ] Database password is secure
- [ ] CORS restricted to production domains
- [ ] API docs disabled in production (`docs_url=None`)
- [ ] HTTPS enabled on all services
- [ ] Rate limiting configured (future enhancement)

---

## Cost Estimates

### Free Tier

- **Vercel**: Hobby plan (free for personal projects)
- **Railway**: $5/month credit on Starter plan
- **Render**: Free tier with limitations
- **Supabase**: Free tier (500MB database, 2GB bandwidth)

### Production (Low Traffic)

- **Vercel Pro**: $20/month
- **Railway Starter**: ~$5-20/month based on usage
- **Render Starter**: $7/month
- **Supabase Pro**: $25/month

AI API costs depend on usage (5 debates/day ≈ $5-15/month).
