# 🐺 Wolf HMS — Coolify VPS Deployment Briefing

**Last Updated:** 2026-03-25
**Status:** ⚠️ Deployment Pending (VPS wiped, Coolify partially installed)

---

## 1. Server Infrastructure

| Detail | Value |
|--------|-------|
| **VPS IP** | `217.216.78.81` |
| **OS** | Ubuntu 24.04 LTS |
| **SSH Access** | `root@217.216.78.81` |
| **PaaS** | **Coolify** (Self-hosted Vercel/Heroku) |
| **Coolify Dashboard** | `http://217.216.78.81:8000` |

---

## 2. Domain & DNS (Cloudflare)

**Nameservers:** `milan.ns.cloudflare.com` / `penny.ns.cloudflare.com`

| Subdomain | Target | Proxy | Purpose |
|-----------|--------|-------|---------|
| `wolfhms.in` | `217.216.78.81` | Proxied ☁️ | Marketing Site |
| `www.wolfhms.in` | `217.216.78.81` | Proxied ☁️ | Marketing Site |
| `api.wolfhms.in` | `217.216.78.81` | Proxied ☁️ | Backend API |
| `ace.wolfhms.in` | `217.216.78.81` | DNS Only 🔘 | Ace Hospital Tenant |

> [!NOTE]
> DNS Only used temporarily for Let's Encrypt SSL generation via Coolify; can be Proxied later.

---

## 3. Existing Tenant (Already Configured)

| Detail | Value |
|--------|-------|
| **Hospital** | Ace Heart & Vascular Institute |
| **Tenant Code** | `ACE` |
| **System Hospital ID** | `3` |
| **Endpoint** | `https://ace.wolfhms.in` |
| **Custom Domain** | `aceheartinstitute.com` |
| **Admin Username** | `aceadmin` |
| **Admin Email** | `admin@aceheartinstitute.com` |
| **Simulation Password** | `AceAdmin@2026` |
| **Patient ID Prefix** | `PPIN` |

### Demo Credentials (Ace Care App — Test Phones)

| Phone | OTP | Notes |
|-------|-----|-------|
| `1234567890` | `123456` | Easy to remember |
| `9999999991` | `123456` | Test phone 1 |
| `9999999992` | `123456` | Test phone 2 |
| `9999999993` | `123456` | Test phone 3 |
| `9999999994` | `123456` | Test phone 4 |
| `9999999995` | `123456` | Test phone 5 |

> Test phones always bypass real SMS — they work in both production and development.

---

## 4. Dockerfiles Available (3)

| File | Base | Notes |
|------|------|-------|
| `/Dockerfile` (root) | `node:20-slim` | Full monorepo build: client `npm run build` → copies to `server/public/`. Port 8080. `DB_HOST=localhost` default |
| `/server/Dockerfile` | `node:20-slim` | Cloud-specific: uses Cloud SQL socket path, runs `prisma db push --accept-data-loss && node server-cloud.js` |
| `/client/Dockerfile` | — | Client-only build |

> [!IMPORTANT]
> For Coolify deployment, use the **root `/Dockerfile`** (it builds both client and server into a single container). Update `DB_HOST` and `DB_PASSWORD` via Coolify environment variables.

---

## 5. VPS Deployment Plan — Phase Status

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1 | VPS wiped to Ubuntu 24.04 | ✅ Done | Fresh OS installed |
| 2 | Coolify installed + dashboard | ⚠️ **Partial** | Was attempted, SSH hanging issues |
| 3 | PostgreSQL via Coolify | ❌ Pending | Need DB instance + connection string |
| 4 | Deploy Node.js API | ❌ Pending | Via Git repo or Docker in Coolify |
| 5 | Deploy React Frontend | ❌ Pending | Bundled with API in root Dockerfile |
| 6 | Deploy Wolf Website | ❌ Pending | Static site (separate repo) |
| 7 | Redis (BullMQ queues) | ❌ Optional | For job queues (claims processing) |
| 8 | DNS/SSL verification | ❌ Pending | Cloudflare A records → Coolify auto-SSL |

> [!WARNING]
> The Ace Hospital APK was previously working with `https://ace.wolfhms.in`, meaning the backend WAS deployed at some point. Past sessions mention SSH hanging and resource constraints that led to the "clean slate" Coolify migration plan.

---

## 6. Deployment Steps (When Ready)

### Step 1: Verify VPS Access
```bash
ssh root@217.216.78.81
# Check if Coolify is running:
docker ps | grep coolify
# If not, install Coolify:
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### Step 2: Access Coolify Dashboard
- Navigate to `http://217.216.78.81:8000`
- Create admin account (if fresh install)
- Add server (localhost)

### Step 3: Deploy PostgreSQL
- In Coolify → New Resource → Database → PostgreSQL
- Note connection string: `postgresql://postgres:PASSWORD@HOST:5432/wolf_hms`

### Step 4: Deploy Wolf HMS (API + Frontend)
- In Coolify → New Resource → Application → Docker / Git
- **Build Pack:** Dockerfile (use root `/Dockerfile`)
- **Domain:** `api.wolfhms.in`
- **Port:** 8080

### Step 5: Set Environment Variables in Coolify
```env
# Database
DATABASE_URL=postgresql://postgres:PASSWORD@INTERNAL_HOST:5432/wolf_hms
DB_HOST=INTERNAL_HOST
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=wolf_hms
DB_PORT=5432

# Core
NODE_ENV=production
PORT=8080
JWT_SECRET=your_jwt_secret_here

# AI (Phase 8 — Required for Enterprise AI)
GEMINI_API_KEY=your_gemini_api_key

# ABDM (Optional — for ABHA/ABDM integration)
ABDM_CLIENT_ID=your_id
ABDM_CLIENT_SECRET=your_secret
ABDM_BASE_URL=https://dev.abdm.gov.in/gateway

# Payments (Optional)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

### Step 6: Run Migrations
```bash
# Inside the Coolify container terminal:
npx prisma db push
node seed.js
```

### Step 7: Verify DNS & SSL
- Cloudflare A records should point to `217.216.78.81`
- Coolify auto-generates Let's Encrypt SSL certificates
- Test endpoints:
  - `https://wolfhms.in` — Frontend
  - `https://api.wolfhms.in/api/health` — Health check
  - `https://ace.wolfhms.in` — Ace tenant

---

## 7. Key Dependencies for Phase 7-8 Features

| Dependency | Required For | How to Set |
|-----------|-------------|-----------|
| `GEMINI_API_KEY` | All 4 Enterprise AI pillars (16 endpoints) | Coolify env vars |
| PostgreSQL 14+ | Billing Interceptor boundary rules | Coolify DB deployment |
| Node.js 20+ | Server runtime | ✅ Already in Dockerfile |
| `prisma db push` | Schema sync (18 tables) | Run inside container |

---

## 8. Pre-Deployment Checklist

Before initiating deployment, confirm:

- [ ] VPS at `217.216.78.81` is accessible via SSH
- [ ] Coolify is running (or needs fresh install)
- [ ] Old deployment state is known (fresh vs existing)
- [ ] `GEMINI_API_KEY` is available for AI features
- [ ] Cloudflare DNS records are current and correct
- [ ] Git repository access is configured (for Coolify Git deploy)

---

## 9. Post-Deployment Verification

| Test | Endpoint | Expected |
|------|----------|----------|
| Health Check | `GET /api/health` | `{ status: 'ok' }` |
| Auth | `POST /api/auth/login` | JWT token returned |
| Patients | `GET /api/patients` | Patient list |
| AI Revenue | `GET /api/ai/revenue/scrub/:id` | Claim scrub result |
| AI Ops | `GET /api/ai/ops/scorecard` | Hospital scorecard |
| Billing Interceptor | Package boundary enforcement | Extra charges triggered |
