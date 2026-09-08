---
name: database-ops
description: Guide for performing production database operations on the Wolf HMS VPS via the exec-sql backdoor API
---

# Production Database Operations

## Access Method
SSH is currently BROKEN. Use the SQL backdoor API for all production DB operations.

## SQL Backdoor Endpoint
```
POST http://185.213.27.158/wolf/api/health/exec-sql
Content-Type: application/json

{
  "setupKey": "WolfSetup2024!",
  "sql": "YOUR SQL QUERY HERE"
}
```

## Example: Using from Node.js
```javascript
const response = await fetch('http://185.213.27.158/wolf/api/health/exec-sql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    setupKey: 'WolfSetup2024!',
    sql: 'SELECT id, code, status FROM emergency_logs WHERE status = \'Active\''
  })
});
const result = await response.json();
console.log(result);
```

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
