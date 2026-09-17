# Admin Runbook: Applying SQL Migrations & Patches

This runbook documents how to safely apply database migration files using `server/scripts/admin-cli.js`.

---

## Prerequisites
- SSH connection to the host / VPS.
- `MIGRATION_CLI_TOKEN` configured.

```bash
export MIGRATION_CLI_TOKEN="<your_cli_token>"
cd /var/www/wolf-hms/server
```

---

## Step 1: Pre-Migration Dry Run (Syntax & Planning)
Verify that the database parser accepts statements without applying mutations:
```bash
node scripts/admin-cli.js --sql "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

---

## Step 2: Apply Migration File
Execute the SQL migration file directly:
```bash
node scripts/admin-cli.js --file "migrations/301_rls_gapfill.sql"
```

The CLI logs every statement execution to `server/logs/admin-cli.log` with timestamp and row count.

---

## Step 3: Verification Query
Confirm the migration took effect:
```bash
node scripts/admin-cli.js --sql "SELECT schemaname, tablename, policyname, permissive FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;"
```
