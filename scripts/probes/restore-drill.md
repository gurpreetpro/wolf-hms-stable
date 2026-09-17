# Disaster Recovery & Restore Drill Runbook

> **Target Metrics**: **RTO $\le$ 15 Minutes** (Recovery Time Objective) | **RPO $\le$ 1 Hour** (Recovery Point Objective)  
> **Applicability**: Wolf HMS PostgreSQL Database Restore Drill  
> **Safety Rule**: Drills MUST be executed against an isolated restore test database (`wolf_hms_restore_test`), NEVER directly overwriting production database without verified backup snapshots.

---

## 1. Prerequisites & Environment Check

Before initiating restoration, ensure the backup dump archive is located and checksums are verified:

```bash
# Verify backup file existence and integrity
ls -lh /var/backups/postgresql/wolf_hms_backup_*.sql.gz

# Pre-validate dump structure with Wolf HMS verify script
node server/scripts/verify-backup.js /var/backups/postgresql/wolf_hms_backup_LATEST.sql.gz
```

---

## 2. Step-by-Step Restoration Procedure

### Step 1: Drain Traffic & Stop Application Service
Prevent incoming writes during database restoration:
```bash
# Stop PM2 cluster instances
pm2 stop wolf-hms-api

# If running behind Nginx, display 503 Maintenance Page
systemctl reload nginx
```

### Step 2: Create Isolated Target Database
Create a clean database for staging the restore:
```bash
# Drop prior test database if present
docker exec -i wolf_fitness_db psql -U postgres -c "DROP DATABASE IF EXISTS wolf_hms_restore_test;"

# Create fresh restore database
docker exec -i wolf_fitness_db psql -U postgres -c "CREATE DATABASE wolf_hms_restore_test OWNER wolf_admin;"
```

### Step 3: Decompress and Stream Dump into Target Database
Restore database objects, sequences, and data:
```bash
# For gzip compressed dumps:
gunzip -c /var/backups/postgresql/wolf_hms_backup_LATEST.sql.gz | \
  docker exec -i wolf_fitness_db psql -U wolf_admin -d wolf_hms_restore_test -v ON_ERROR_STOP=1
```

### Step 4: Run Post-Restore Smoke & Integrity Queries
Execute automated verification probes against the restored database:
```bash
docker exec -i wolf_fitness_db psql -U wolf_admin -d wolf_hms_restore_test << 'EOF'
-- 1. Check core entity record counts
SELECT 'Users Count' AS entity, COUNT(*) FROM users
UNION ALL
SELECT 'Hospitals Count', COUNT(*) FROM hospitals
UNION ALL
SELECT 'Patients Count', COUNT(*) FROM patients
UNION ALL
SELECT 'Admissions Count', COUNT(*) FROM admissions
UNION ALL
SELECT 'Audit Logs Count', COUNT(*) FROM audit_logs;

-- 2. Verify latest audit log hash chain integrity
SELECT id, created_at, action, resource_type, prev_hash, record_hash 
FROM audit_logs 
ORDER BY created_at DESC, id DESC 
LIMIT 5;

-- 3. Verify Refresh Tokens exist
SELECT COUNT(*) AS active_refresh_tokens FROM refresh_tokens WHERE revoked = false;
EOF
```

### Step 5: Database Swap or Connection Cutover
Once smoke queries verify 100% integrity:

**Option A (Direct DB Rename — Lowest Downtime, < 10 seconds)**:
```bash
docker exec -i wolf_fitness_db psql -U postgres << 'EOF'
-- Terminate existing connections to prod
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'wolf_hms_prod';

-- Rotate current prod to backup archive name
ALTER DATABASE wolf_hms_prod RENAME TO wolf_hms_prod_pre_restore;

-- Promote restored database to production
ALTER DATABASE wolf_hms_restore_test RENAME TO wolf_hms_prod;
EOF
```

**Option B (Update Environment Variable)**:
Update `DATABASE_URL` or `DB_NAME` in `server/.env` to point to the validated restore database.

### Step 6: Restart Application & Verify Live Health
```bash
# Restart PM2 cluster
pm2 start wolf-hms-api

# Check logs for successful database connectivity
pm2 logs wolf-hms-api --lines 50

# Probe health endpoint
curl -f http://127.0.0.1:5002/api/health
```

---

## 3. Post-Drill Cleanup
After verifying drill success in a staging test:
```bash
# Remove temporary test database
docker exec -i wolf_fitness_db psql -U postgres -c "DROP DATABASE IF EXISTS wolf_hms_restore_test;"
docker exec -i wolf_fitness_db psql -U postgres -c "DROP DATABASE IF EXISTS wolf_hms_prod_pre_restore;"
```

---

## 4. Disaster Recovery Audit Checklist

| Item | Expected Result | Pass/Fail |
|---|---|---|
| Dump Verification | `verify-backup.js` returns exit code 0 | [ ] |
| RTO Elapsed Time | Total restoration time $\le 15$ minutes | [ ] |
| User Table Count | Matches or exceeds pre-disaster record count | [ ] |
| Patient Table Count | Matches or exceeds pre-disaster record count | [ ] |
| Audit Hash Continuity | Latest `record_hash` matches expected digest | [ ] |
| API Health Check | `GET /api/health` returns status `healthy` | [ ] |
