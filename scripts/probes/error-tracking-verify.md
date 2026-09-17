# Sentry Error Pipeline Activation & Verification Runbook

> **Applicability**: Wolf HMS Enterprise Error Monitoring  
> **Target**: Verification of automated error reporting and exception telemetry via Sentry (`@sentry/node`)  
> **Safety Guarantee**: Sentry is strictly opt-in and gated by `SENTRY_DSN`. Missing DSN safely skips initialization with zero performance impact.

---

## 1. Overview

Wolf HMS integrates `@sentry/node` for production error tracking, transaction profiling, and breadcrumb auditing across asynchronous API routes. The pipeline is initialized at boot inside `server/services/OverwatchService.js` and `server/server-cloud.js:446`.

### Verification Flow:
1. Operator sets `SENTRY_DSN` in VPS `.env`.
2. Reloads the PM2 cluster.
3. Tests the gate via `GET /api/debug/sentry-trigger` (strictly gated to `super_admin`).
4. Confirms receipt of the test exception event in the Sentry Project Dashboard.

---

## 2. Step-by-Step Operator Procedure

### Step 1: Configure Sentry DSN on Production VPS

Log into the production VPS and append your project's client key (DSN) to `server/.env`:

```bash
# Append SENTRY_DSN to server environment file
echo "SENTRY_DSN=https://<public-key>@o<org-id>.ingest.sentry.io/<project-id>" >> /var/www/wolf-hms/server/.env

# Verify setting is present
grep SENTRY_DSN /var/www/wolf-hms/server/.env
```

### Step 2: Restart PM2 Application Cluster

Restart the application so Overwatch picks up the new DSN:

```bash
# Reload cluster with zero downtime
pm2 reload wolf-hms-api

# Inspect logs to verify initialization
pm2 logs wolf-hms-api --lines 40 | grep -i "Overwatch"
```
*Expected log output:*
```
[Overwatch] ✅ Sentry error tracking initialized
🔍 AI Overwatch monitoring initialized
```

### Step 3: Trigger Verified Test Exception

Issue an authenticated request to `/api/debug/sentry-trigger` using a `super_admin` Bearer token in a staging/testing environment:

```bash
# Obtain super_admin JWT token
SUPER_ADMIN_JWT="<TOKEN>"

# Invoke the test trigger
curl -i -H "Authorization: Bearer $SUPER_ADMIN_JWT" \
  "http://127.0.0.1:5002/wolf/api/debug/sentry-trigger"
```

*Expected Behavior:*
- In non-production: Triggers an explicit `Wolf HMS Test Sentry Error`, records stack trace in Sentry, and returns 500 error response.
- In `NODE_ENV=production`: Returns `403 Forbidden` (`Sentry test trigger is disabled in production environment.`), ensuring testing hooks cannot be abused live.

### Step 4: Verify Event in Sentry Dashboard

1. Navigate to your Sentry project: `https://sentry.io/organizations/<org>/issues/`.
2. Locate the newest issue titled:
   `Error: Wolf HMS Test Sentry Error: Triggered by super_admin via /api/debug/sentry-trigger`
3. Verify that:
   - Environment matches your server setting (e.g. `staging` or `production`).
   - Breadcrumbs include the HTTP request details.
   - PII scrubbing confirmed: Passwords and sensitive cookies are redacted.

---

## 3. Security & Safety Gates

| Gate | Behavior |
|---|---|
| Missing `SENTRY_DSN` | Sentry is skipped at boot; application runs normally without warnings or overhead. |
| Production Environment Gate | `/api/debug/sentry-trigger` returns 403 Forbidden in `NODE_ENV=production`. |
| Role Authorization Gate | Only users with `role: super_admin` can invoke the trigger endpoint. All other roles receive 403. |
| Unauthenticated Access | Returns 401 Unauthorized. |
