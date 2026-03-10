# 🔍 AI Overwatch Monitoring Setup

## Quick Start

### 1. Install packages (already done)
```bash
npm install @sentry/node prom-client node-telegram-bot-api
```

### 2. Add to server.js
```javascript
// At the top, after other requires
const Overwatch = require('./services/OverwatchService');
const overwatchRoutes = require('./routes/overwatchRoutes');

// After app is created
Overwatch.initSentry(app);
Overwatch.initTelegramBot();

// Add metrics middleware (after other middleware)
app.use(Overwatch.metricsMiddleware);

// Add routes
app.use('/api/overwatch', overwatchRoutes);

// In error handler, add:
Overwatch.captureError(error, { path: req.path, method: req.method });
```

### 3. Configure .env
```env
SENTRY_DSN=your_sentry_dsn
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| GET `/api/overwatch/metrics` | Prometheus metrics |
| GET `/api/overwatch/dashboard` | Health dashboard |
| GET `/api/overwatch/alerts` | Recent alerts |
| GET `/api/overwatch/stats` | System stats |
| POST `/api/overwatch/test-alert` | Test alerting |

---

## Setting Up Telegram Bot

1. Chat with @BotFather on Telegram
2. Create new bot: `/newbot`
3. Get token from BotFather
4. Add bot to a group or get your chat ID
5. Set env variables

---

## Setting Up Sentry (Free)

1. Go to https://sentry.io
2. Create account (free tier)
3. Create new project → Node.js
4. Copy DSN to .env

---

## Grafana Dashboard (Optional)

Add Prometheus data source pointing to:
`http://localhost:5000/api/overwatch/metrics`

---

## Alert Types

- 🔴 **Critical**: Server down, database error
- 🟡 **Warning**: High memory, slow queries
- 🟢 **Info**: Deployments, stats
