# Neon Database Migration Guide

> Migration from Railway PostgreSQL to Neon Serverless PostgreSQL

| Meta | Value |
|------|-------|
| **Updated** | 2025-01-12 |
| **From** | Railway.com |
| **To** | Neon (neon.tech) |
| **Deployment** | Vercel |

---

## Overview

This guide covers migrating ApoloShop's PostgreSQL database from Railway to Neon for better Vercel integration and serverless performance.

---

## Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech) and sign in (use GitHub/Google)
2. Click **"New Project"**
3. Configure:
   - **Project name**: `apoloshop`
   - **Region**: Choose closest to your users (e.g., `us-east-2` or `ap-southeast-1`)
   - **Database name**: `neondb` (default)
4. Click **Create Project**

---

## Step 2: Get Connection Strings

In Neon Console > **Connection Details**:

### Pooled Connection (for app queries)
```
postgresql://USER:PASSWORD@ep-xxx-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```
Use this for `DATABASE_URL`

### Direct Connection (for migrations)
```
postgresql://USER:PASSWORD@ep-xxx-xxx.REGION.aws.neon.tech/neondb?sslmode=require
```
Use this for `DIRECT_URL`

> **Note**: The pooled URL has `-pooler` in the hostname

---

## Step 3: Export Data from Railway

### Option A: pg_dump (Recommended)

```bash
# Export from Railway
pg_dump "postgresql://postgres:PASSWORD@HOST:PORT/railway" \
  --no-owner \
  --no-acl \
  --schema=apolo \
  > backup.sql
```

### Option B: Prisma db pull + seed
If starting fresh, just push the schema and seed:
```bash
bun run db:push
bun run db:seed
```

---

## Step 4: Import to Neon

### Using psql
```bash
# Create schema first
psql "DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS apolo;"

# Import data
psql "DATABASE_URL" < backup.sql
```

### Using Neon Console
1. Go to **SQL Editor** in Neon Console
2. Run: `CREATE SCHEMA IF NOT EXISTS apolo;`
3. Paste and run your SQL backup

---

## Step 5: Update Vercel Environment Variables

In Vercel Dashboard > **Settings** > **Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Pooled connection string | Production, Preview |
| `DIRECT_URL` | Direct connection string | Production, Preview |

### Example Values:
```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## Step 6: Update Local .env

Copy from `.env.example` and fill in your Neon credentials:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require"
```

---

## Step 7: Regenerate Prisma Client

```bash
# Generate new Prisma client
bun run db:generate

# Push schema to Neon (if new database)
bun run db:push

# Seed data (if needed)
bun run db:seed
```

---

## Step 8: Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "[feat] Migrate database from Railway to Neon"

# Push to trigger Vercel deployment
git push
```

---

## Verification Checklist

- [ ] Neon project created
- [ ] Both connection strings obtained (pooled + direct)
- [ ] Data exported from Railway (if migrating existing data)
- [ ] Data imported to Neon
- [ ] Vercel environment variables updated
- [ ] Local `.env` updated
- [ ] Prisma client regenerated
- [ ] Application tested locally
- [ ] Deployed to Vercel successfully

---

## Neon-Specific Configuration

### Prisma Schema Changes

The `prisma/schema.prisma` has been updated:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // Added for Neon
  schemas   = ["apolo"]
}
```

### Why Two URLs?

- **DATABASE_URL** (Pooled): Uses Neon's connection pooler for better performance with serverless functions. Handles connection limits automatically.

- **DIRECT_URL**: Direct connection for migrations and schema changes. Required for `prisma migrate` and `prisma db push`.

---

## Troubleshooting

### Connection Timeout
- Ensure `?sslmode=require` is in your connection string
- Check if your IP is whitelisted (Neon allows all by default)

### Schema Not Found
Run in Neon SQL Editor:
```sql
CREATE SCHEMA IF NOT EXISTS apolo;
```

### Prisma Migration Errors
Use `DIRECT_URL` for migrations:
```bash
DATABASE_URL=$DIRECT_URL bun prisma migrate deploy
```

---

## Benefits of Neon

1. **Serverless-first**: Auto-scales, no idle costs
2. **Vercel Integration**: Native integration, automatic branching
3. **Branching**: Database branches for preview deployments
4. **Free Tier**: Generous free tier for development

---

## Rollback Plan

If issues occur, revert to Railway:

1. Update Vercel env vars back to Railway connection
2. Revert `prisma/schema.prisma` changes
3. Redeploy

Keep Railway running until Neon is verified working.
