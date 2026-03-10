# 🐺 Wolf HMS — Installation Guide

**Version:** 2.0.0 | **Last Updated:** 2026-03-05

---

## Prerequisites

| Requirement | Version | Required |
|------------|---------|----------|
| **Node.js** | ≥ 20.0.0 | ✅ Yes |
| **PostgreSQL** | ≥ 14 | ✅ Yes |
| **npm** | ≥ 9 | ✅ Yes (comes with Node) |
| **Redis** | Any | ❌ Optional (for queues/cache) |
| **Git** | Any | ❌ Optional (for cloning) |

---

## Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
# Server
cd server
npm install

# Client (web dashboard)
cd ../client
npm install
cd ..
```

**Or use the batch script (Windows):**
```
2_INSTALL_DEPENDENCIES.bat
```

### 2. Configure Environment

```bash
# Copy the template
cp server/.env.example server/.env

# Edit with your values
notepad server/.env    # Windows
nano server/.env       # Linux/Mac
```

**Required values to set:**

| Variable | What To Set |
|----------|-------------|
| `DB_PASSWORD` | Your PostgreSQL password |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `ADMIN_DEFAULT_PASSWORD` | Strong password for admin accounts |

All other values have sensible defaults for development.

### 3. Create Database

```bash
# Connect to PostgreSQL and create the database
psql -U postgres -c "CREATE DATABASE hospital_db;"
```

**Or use the batch script (Windows):**
```
1_SETUP_DATABASE.bat
```

### 4. Start the Server

```bash
cd server
npm run dev   # Development (with auto-reload)
npm start     # Production
```

**Or use the batch script (Windows):**
```
5_START_ALL.bat
```

### 5. Verify Installation

Open your browser to:
- **Backend API:** http://localhost:8080/api/health
- **Web Dashboard:** http://localhost:5173

**On first boot, the server automatically:**
- ✅ Runs all 153 database migrations
- ✅ Creates admin user accounts
- ✅ Initializes all tables and indexes
- ✅ Logs any errors to `/tmp/startup_error.txt`

---

## Default Login

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin_user` | Set via `ADMIN_DEFAULT_PASSWORD` in `.env` |

> **Tip:** If login fails, run `6_FIX_PASSWORDS.bat` to reset all passwords.

---

## Docker Deployment

```bash
# Build the image
docker build -t wolf-hms .

# Run with environment variables
docker run -d \
  --name wolf-hms \
  -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PASSWORD=your_password \
  -e JWT_SECRET=your_jwt_secret \
  -e NODE_ENV=production \
  wolf-hms
```

The Dockerfile automatically:
1. Installs client dependencies & builds the frontend
2. Installs server dependencies (production only)
3. Copies the built frontend to `server/public`
4. Starts `server.js` on port 8080

---

## Cloud Deployment (Google Cloud Run)

```bash
# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT/wolf-hms

# Deploy
gcloud run deploy wolf-hms \
  --image gcr.io/YOUR_PROJECT/wolf-hms \
  --platform managed \
  --region asia-south1 \
  --set-env-vars "DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE" \
  --set-env-vars "DB_PASSWORD=YOUR_PASSWORD" \
  --set-env-vars "JWT_SECRET=YOUR_SECRET" \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE
```

---

## New Hospital Onboarding

After installation, to add a new hospital:

```sql
-- Connect to your database
INSERT INTO hospitals (name, address, phone, email, license_number)
VALUES (
  'City General Hospital',
  '123 Medical Drive, Mumbai 400001',
  '+91-22-1234-5678',
  'admin@cityhospital.com',
  'MH-HMS-2026-001'
);
```

The multi-tenant system will automatically scope all data to this hospital via `hospital_id`.

---

## Project Structure

```
wolf-hms-stable/
├── server/                    # Backend (Node.js + Express)
│   ├── server.js              # Main entry point
│   ├── controllers/           # 30+ API controllers
│   ├── routes/                # 40+ route files
│   ├── migrations/            # 153 SQL migration files
│   ├── services/              # Business logic services
│   ├── middleware/             # Auth, rate-limit, logging
│   ├── .env.example           # Environment template
│   └── package.json           # v2.0.0
├── client/                    # Frontend (React + Vite)
│   ├── src/                   # Source code
│   └── Dockerfile             # Client-only Docker build
├── wolf-ultimate/             # Mobile app (React Native + Expo)
│   └── src/                   # 48+ screens, 15 services
├── Dockerfile                 # Full-stack Docker build
├── INSTALL.md                 # This file
├── 1_SETUP_DATABASE.bat       # Windows: DB setup
├── 2_INSTALL_DEPENDENCIES.bat # Windows: npm install
├── 3_START_SERVER.bat         # Windows: Start backend
├── 4_START_CLIENT.bat         # Windows: Start frontend
├── 5_START_ALL.bat            # Windows: Start everything
└── 6_FIX_PASSWORDS.bat        # Windows: Reset passwords
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Cannot connect to database"** | Check `DB_HOST`, `DB_PASSWORD`, `DB_PORT` in `.env`. Ensure PostgreSQL is running. |
| **"JWT_SECRET required"** | Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| **Login not working** | Run `6_FIX_PASSWORDS.bat` or `cd server && node fix_passwords.js` |
| **Migrations failed** | Check `/tmp/startup_error.txt`. Server starts in "zombie mode" for debugging. |
| **Port already in use** | Change `PORT` in `.env` or kill the process on port 8080 |
| **Redis not available** | Leave `REDIS_URL` empty — the server uses in-memory cache as fallback |

---

## Optional Integrations

| Feature | Environment Variable | Where To Get |
|---------|---------------------|-------------|
| **AI Features** | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| **Payment Gateway** | `RAZORPAY_KEY_ID`, `RAZORPAY_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com) |
| **Telegram Alerts** | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | [BotFather](https://t.me/BotFather) |
| **Error Tracking** | `SENTRY_DSN` | [Sentry.io](https://sentry.io) |
| **Video Calling** | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` | [LiveKit](https://livekit.io) |
| **Cloud Backup** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) |

---

**🐺 Wolf HMS v2.0 — Enterprise Hospital Management System**
