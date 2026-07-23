# Deployment Guide

## Docker Compose (Development)

```bash
git clone https://github.com/fxxkrlab/ACP_Market.git
cd ACP_Market
docker compose up --build
```

All services start automatically: PostgreSQL, Redis, Backend (hot reload), Frontend (HMR).

## Docker Compose (Production)

1. Create `.env` from `.env.example` with production values
2. Set `COOKIE_SECURE=true`, `DEBUG=false`
3. Set a strong `JWT_SECRET_KEY` and `INIT_ADMIN_PASSWORD`
4. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

```bash
docker compose -f docker-compose.yml up -d --build
```

## GHCR Image

Pre-built backend images are available:

```bash
docker pull ghcr.io/fxxkrlab/acp_market:0.1.0
docker pull ghcr.io/fxxkrlab/acp_market:latest
```

## Production Checklist

- [ ] Change `JWT_SECRET_KEY` from default
- [ ] Change `INIT_ADMIN_PASSWORD` from default
- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `DEBUG=false`
- [ ] Configure Stripe keys
- [ ] Configure SMTP or SendGrid for password reset emails
- [ ] Set up reverse proxy (nginx/Caddy) with HTTPS
- [ ] Configure `CORS_ORIGINS` for your domain
- [ ] Set `FRONTEND_URL` to your production URL
- [ ] Set `MARKET_DOMAIN` to your production domain
