# Admin Runbook: Database Diagnostics & Emergency Operations

This runbook documents operational commands for querying database status, active alerts, and table row counts.

---

## Prerequisites
- SSH connection to the host / VPS.
- `MIGRATION_CLI_TOKEN` configured.

```bash
export MIGRATION_CLI_TOKEN="<your_cli_token>"
cd /var/www/wolf-hms/server
```

---

## Diagnostics Queries

### 1. Active Hospital Emergencies
```bash
node scripts/admin-cli.js --sql "SELECT id, code, location, status, created_at FROM emergency_logs WHERE status = 'Active' ORDER BY created_at DESC;"
```

### 2. Resolve Stale Emergencies
```bash
node scripts/admin-cli.js --sql "UPDATE emergency_logs SET status = 'Resolved', resolved_at = NOW() WHERE status = 'Active';"
node scripts/admin-cli.js --sql "UPDATE emergency_events SET status = 'Resolved', resolved_at = NOW() WHERE status = 'Active';"
```

### 3. Online Security Guards & Telemetry
```bash
node scripts/admin-cli.js --sql "SELECT u.id, u.username, u.full_name, gl.latitude, gl.longitude, gl.floor_number, gl.battery_level, gl.timestamp FROM users u JOIN guard_locations gl ON u.id = gl.guard_id WHERE gl.timestamp > NOW() - INTERVAL '30 minutes' ORDER BY gl.timestamp DESC;"
```

### 4. Row Counts on High-Traffic Tables
```bash
node scripts/admin-cli.js --sql "SELECT relname AS table_name, n_live_tup AS row_estimate FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;"
```
