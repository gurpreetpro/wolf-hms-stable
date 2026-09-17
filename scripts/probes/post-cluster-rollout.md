# 🚀 Runbook: Post-Cluster Rollout (PM2 Cluster Mode)

> **EXECUTION NOTICE: MANUAL HUMAN OPERATOR STEP**  
> ⚠️ This runbook must be executed by a human operator with root VPS SSH access. Do NOT automate directly from AI assistant sessions.

---

## 🎯 Purpose
Migrate the single-process PM2 instance (`wolf-hms-api` in fork mode) to a high-concurrency multi-worker cluster utilizing all available CPU cores on the host, paired with Redis pub/sub Socket.IO clustering.

---

## 📋 Prerequisites
1. Redis service running and accessible on VPS (or Docker host, e.g. `redis://127.0.0.1:6379`).
2. `REDIS_URL` populated in `/var/www/wolf-hms/server/.env`:
   ```bash
   REDIS_URL=redis://127.0.0.1:6379
   ```
3. `deploy/ecosystem.config.cjs` uploaded to `/var/www/wolf-hms/ecosystem.config.cjs`.
4. Verification that PostgreSQL connection pool max is set appropriately (see W3 PgBouncer hardening).

---

## 🛠️ Step-by-Step Execution

### Step 1: Connect to Production VPS via SSH
Use the Node.js `ssh2` script or terminal with credentials from `VPS_CREDENTIALS.md`:
```bash
ssh root@185.213.27.158
```

### Step 2: Navigate to Wolf HMS Directory
```bash
cd /var/www/wolf-hms
```

### Step 3: Inspect Current PM2 Status
```bash
pm2 list
pm2 describe wolf-hms-api
```
*Note current PID, uptime, and memory.*

### Step 4: Gracefully Delete Legacy Fork-Mode Process
```bash
pm2 delete wolf-hms-api
```

### Step 5: Start Clustered Process from Ecosystem Config
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### Step 6: Verify Clustered Workers
```bash
pm2 list
```
*Expected output: Multiple worker rows for `wolf-hms-api` with `mode: cluster` and `status: online`.*

```bash
pm2 logs wolf-hms-api --lines 30 --nostream
```
*Check for:*
- `🚀 Starting Wolf HMS Server (Cloud Mode)...`
- `[SocketCluster] adapter attached`
- `✅ All services initialized`

---

## 🔌 Sticky-Session Notice for WebSockets
> [!IMPORTANT]
> When running Socket.IO across multiple worker processes behind Nginx:
> - If Nginx routes HTTP polling requests across different worker PIDs before the connection upgrades to WebSocket, clients may receive `{"code":1,"message":"Session ID unknown"}`.
> - **Recommendation**: In Nginx upstream configuration, use `ip_hash;` or ensure clients connect directly with `transports: ['websocket']` (which WGM and modern web dashboard clients do).
> - Nginx upstream snippet:
>   ```nginx
>   upstream wolf_api {
>       ip_hash;
>       server 127.0.0.1:5002;
>   }
>   ```

---

## 🧪 Post-Rollout Verification Probes

### Probe 1: HTTP Health & Readiness Probe
```bash
curl -i http://localhost:5002/api/health/ready
```
*Expected: HTTP 200 OK with `{"ready":true,"database":"healthy"}`.*

### Probe 2: Public Nginx Route Probe
```bash
curl -i http://185.213.27.158/wolf/api/health
```
*Expected: HTTP 200 OK.*

### Probe 3: Socket.IO Clustering Test
Connect two distinct clients to different workers and trigger an emergency alert or guard ping. Confirm message fan-out occurs cross-process via Redis pub/sub.

---

## 🔄 Rollback Procedure (If Workers Fail or Conflict)
```bash
pm2 delete wolf-hms-api
cd /var/www/wolf-hms/server
pm2 start server-cloud.js --name "wolf-hms-api"
pm2 save
```
