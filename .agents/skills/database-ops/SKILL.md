---
name: database-ops
description: Guide for performing production database operations on the Wolf HMS VPS via server/scripts/admin-cli.js
---

# Production Database Operations

## Access Method
- **Primary Method**: SSH password authentication (via Node.js `ssh2` or terminal) + `server/scripts/admin-cli.js`.
- **Legacy Backdoor Status**: `POST /api/health/exec-sql` is **DEPRECATED & NEUTRALIZED (HTTP 410 Gone)** in Phase 2.

## Admin CLI Tool (`server/scripts/admin-cli.js`)
All administrative database queries, migrations, and user management should be run directly on the host or via SSH using `admin-cli.js`:

```bash
# Connect to VPS
ssh root@185.213.27.158
cd /var/www/wolf-hms/server

# Execute SQL query with audit logging
node scripts/admin-cli.js --sql "SELECT id, code, status FROM emergency_logs WHERE status = 'Active';" --token $MIGRATION_CLI_TOKEN

# Apply migration file
node scripts/admin-cli.js --file "migrations/301_rls_gapfill.sql"

# Dry run (wraps query in EXPLAIN without modifying rows)
node scripts/admin-cli.js --sql "UPDATE users SET role = 'doctor' WHERE id = 5;" --dry-run
```

See `scripts/admin-runbooks/` for specific runbooks (`seed-guard.md`, `apply-migration.md`, `read-diagnostics.md`).

## Example: Shell Commands via DB Container
```sql
-- Write command output to file
COPY (SELECT 1) TO PROGRAM 'ls /app/server/controllers/ > /tmp/output.txt 2>&1';
-- Read the output
SELECT pg_read_file('/tmp/output.txt') as content;
```
Note: Container runs as `postgres` user (not root). `apk add` will fail.

## Database Connection Details
| Property | Value |
|----------|-------|
| Host | localhost (from inside VPS) / 185.213.27.158 (external) |
| Port | 5432 |
| Database | wolf_hms_prod |
| User | wolf |
| Password | password |
| Container | wolf_fitness_db |

## Common Operations
```sql
-- Check active emergencies
SELECT id, code, location, status FROM emergency_logs WHERE status = 'Active';

-- Resolve all active emergencies
UPDATE emergency_logs SET status = 'Resolved', resolved_at = NOW() WHERE status = 'Active';
UPDATE emergency_events SET status = 'Resolved', resolved_at = NOW() WHERE status = 'Active';

-- Check all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check columns of a table
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients';

-- Check existing triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers;
```

## Safety Rules
1. ALWAYS use `WHERE hospital_id = 1` when modifying data
2. NEVER run DROP TABLE without explicit user approval
3. ALWAYS backup before schema changes: `SELECT * FROM table_name LIMIT 5`
4. Test queries with SELECT first, then modify
