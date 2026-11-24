# LocalOS — Production Deployment Guide

## 1. Prerequisites
- Node.js 18+ or 20+ (Node 24 supported)
- PostgreSQL 15+ (Hosted on AWS RDS, Supabase, Neon, or self-hosted)
- Redis 7+ (Hosted on Upstash or AWS ElastiCache)

## 2. Environment Variables
Configure the following in your production environment:
```env
DATABASE_URL="postgresql://user:password@host:5432/localos_db?schema=public&sslmode=require"
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_URL="https://app.localos.in"
JWT_SECRET="<generate_secure_random_key_64_chars>"
COOKIE_DOMAIN=".localos.in"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

## 3. Database Migration & Seeding
```bash
npx prisma db push
# or in CI/CD: npx prisma migrate deploy
npm run db:seed
```

## 4. Build & Run
```bash
npm run build
npm run start
```

## 5. Docker Deployment
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/ ./packages/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm --workspace=apps/web run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "--workspace=apps/web", "run", "start"]
```

