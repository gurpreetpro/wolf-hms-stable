# Admin Runbook: Guard & Staff User Provisioning

This runbook documents how to provision or verify security guard and staff accounts using `server/scripts/admin-cli.js` instead of the legacy HTTP backdoor.

---

## Prerequisites
- SSH connection to the host / VPS.
- `MIGRATION_CLI_TOKEN` loaded in the shell environment.

```bash
export MIGRATION_CLI_TOKEN="<your_cli_token>"
cd /var/www/wolf-hms/server
```

---

## Step 1: Verify Existing User
Check if the user exists before provisioning:
```bash
node scripts/admin-cli.js --sql "SELECT id, username, role, hospital_id, status FROM users WHERE username = 'guard_kumar';"
```

---

## Step 2: Seed New Security Guard
Create a new guard account with pre-hashed bcrypt password and assigned hospital tenant:
```bash
node scripts/admin-cli.js --sql "INSERT INTO users (username, password_hash, role, hospital_id, status, full_name) VALUES ('guard_sharma', '\$2a\$10\$X7fB2gZJ...', 'security_guard', 1, 'APPROVED', 'Officer Sharma') ON CONFLICT (username) DO NOTHING;"
```

---

## Step 3: Verify Assigned Permissions
Ensure role and status are set correctly:
```bash
node scripts/admin-cli.js --sql "SELECT id, username, role, status FROM users WHERE role = 'security_guard';"
```
