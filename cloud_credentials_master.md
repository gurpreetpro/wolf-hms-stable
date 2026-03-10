# Wolf HMS - Cloud Deployment & Credentials Master Document 🔐

**Last Updated:** 2026-01-19
**Environment:** Production (Google Cloud Platform)
**Status:** ✅ Fully Operational

---

## 1. Project Identity

| Property | Value |
|----------|-------|
| **Project Name** | Wolf Tech HMS |
| **Project ID** | `wolf-tech-hms` |
| **Project Number** | `708086797390` |
| **Region** | `asia-south1` (Mumbai) |

---

## 2. Application Server (Cloud Run)

| Property | Value |
|----------|-------|
| **Service Name** | `wolf-tech-server` |
| **Region** | `asia-south1` |
| **Public URL** | https://wolf-tech-server-708086797390.asia-south1.run.app |
| **Docker Registry** | `asia-south1-docker.pkg.dev/wolf-tech-hms/wolf-hms-repo/wolf-tech-server` |
| **Current Image Tag** | `:v2` |
| **Active Revision** | `wolf-tech-server-00162-h6p` |

### Verified Endpoints
| Endpoint | Status |
|----------|--------|
| `/api/health` | ✅ OK |
| `/api/debug/ping` | ✅ pong |
| `/api/articles/categories` | ✅ Working |
| `/api/home-lab/packages` | ✅ Working |

---

## 3. Database Credentials (Cloud SQL) ⚠️

> [!CAUTION]
> **CRITICAL SECURITY INFORMATION - KEEP CONFIDENTIAL**

| Property | Value |
|----------|-------|
| **Instance Name** | `wolf-hms-db` |
| **Connection Name** | `wolf-tech-hms:asia-south1:wolf-hms-db` |
| **Database Version** | PostgreSQL 17 |
| **Public IP** | `34.180.27.29` |
| **Database Name** | `hospital_db` |
| **Admin User** | `postgres` |
| **Admin Password** | `WolfHMS_Secure_2026!` |
| **Connection Method** | Unix Socket via Cloud Run |
| **Socket Path** | `/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db` |

---

## 4. Environment Variables (Cloud Run)

These environment variables are configured on the Cloud Run service:

```yaml
DB_HOST: /cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db
DB_USER: postgres
DB_NAME: hospital_db
DB_PASSWORD: WolfHMS_Secure_2026!
JWT_SECRET: WolfHMS_Super_Secret_Key_2026
NODE_ENV: production
```

---

## 5. API Secrets & Keys

### Migration Endpoint
| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/migrations/run` |
| **Header Key** | `x-wolf-admin-key` |
| **Header Value** | `wolf_secret_2026` |

### SQL Execution Endpoint
| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/sync/sql` |
| **Body Key** | `secret` |
| **Secret Value** | `WolfHMS_Migration_Secret_2026` |

### Example: Execute SQL
```powershell
$body = '{"secret":"WolfHMS_Migration_Secret_2026","sql":"SELECT * FROM users LIMIT 5"}'
Invoke-RestMethod -Uri "https://wolf-tech-server-708086797390.asia-south1.run.app/api/sync/sql" -Method POST -Body $body -ContentType "application/json"
```

---

## 6. Deployment Commands

### Build & Push Docker Image
```powershell
gcloud builds submit --tag asia-south1-docker.pkg.dev/wolf-tech-hms/wolf-hms-repo/wolf-tech-server:v2 --project wolf-tech-hms
```

### Deploy to Cloud Run
```powershell
gcloud run deploy wolf-tech-server `
  --image asia-south1-docker.pkg.dev/wolf-tech-hms/wolf-hms-repo/wolf-tech-server:v2 `
  --region asia-south1 `
  --project wolf-tech-hms `
  --allow-unauthenticated `
  --memory 1Gi `
  --timeout 300 `
  --add-cloudsql-instances wolf-tech-hms:asia-south1:wolf-hms-db `
  --set-env-vars "DB_HOST=/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db,DB_USER=postgres,DB_NAME=hospital_db,DB_PASSWORD=WolfHMS_Secure_2026!,JWT_SECRET=WolfHMS_Super_Secret_Key_2026,NODE_ENV=production"
```

### Route Traffic to Specific Revision
```powershell
gcloud run services update-traffic wolf-tech-server --region asia-south1 --project wolf-tech-hms --to-revisions [REVISION_NAME]=100
```

### List Revisions
```powershell
gcloud run revisions list --service wolf-tech-server --region asia-south1 --project wolf-tech-hms --limit=5
```

### View Logs
```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=wolf-tech-server" --limit=50 --format="value(textPayload)" --project wolf-tech-hms --freshness=10m
```

---

## 7. Database Connection (Local Development)

### Cloud SQL Proxy
```powershell
# Start the proxy (run in separate terminal)
cloud-sql-proxy wolf-tech-hms:asia-south1:wolf-hms-db --port 5433

# Connection string for local development
postgresql://postgres:WolfHMS_Secure_2026!@localhost:5433/hospital_db
```

### Reset Cloud SQL Password
```powershell
gcloud sql users set-password postgres --instance=wolf-hms-db --password="NEW_PASSWORD" --project=wolf-tech-hms
```

---

## 8. Troubleshooting

### "password authentication failed"
1. Verify password matches in Cloud Run env vars
2. If mismatch, reset Cloud SQL password:
   ```powershell
   gcloud sql users set-password postgres --instance=wolf-hms-db --password="WolfHMS_Secure_2026!" --project=wolf-tech-hms
   ```

### "Route returns 404"
1. Check if new revision is active:
   ```powershell
   gcloud run revisions list --service wolf-tech-server --region asia-south1 --project wolf-tech-hms --limit=3
   ```
2. Route traffic to correct revision:
   ```powershell
   gcloud run services update-traffic wolf-tech-server --to-revisions [REVISION]=100 --region asia-south1 --project wolf-tech-hms
   ```

### "ECONNREFUSED 127.0.0.1:5432"
- Cloud SQL env vars missing. Redeploy with `--add-cloudsql-instances` and `--set-env-vars`

### "relation does not exist"
- Run migrations via `/api/sync/sql` endpoint with the migration secret

---

## 9. Quick Reference

| What | Value |
|------|-------|
| **Production URL** | https://wolf-tech-server-708086797390.asia-south1.run.app |
| **GCP Project** | `wolf-tech-hms` |
| **Cloud SQL Instance** | `wolf-hms-db` |
| **DB Name** | `hospital_db` |
| **DB Password** | `WolfHMS_Secure_2026!` |
| **Migration Secret** | `WolfHMS_Migration_Secret_2026` |
| **Admin Key** | `wolf_secret_2026` |
| **JWT Secret** | `WolfHMS_Super_Secret_Key_2026` |
