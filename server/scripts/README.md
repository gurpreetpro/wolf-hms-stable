# WOLF HMS Scripts

Utility scripts for database seeding, migrations, and maintenance.

## Categories

### Seeding Scripts (`seed_*.js`)
- `seed_lab_data.js` - Lab test templates
- `seed_medicines.js` - Pharmacy inventory
- `seed_users.js` - Demo users
- `seed_wards.js` - Ward/bed setup

### Migration Scripts (`run_*.js`)
- `run_migration.js` - Run SQL migrations
- `run_phase*.js` - Phase-specific migrations

## Usage

```bash
cd server
node scripts/seed_users.js
node scripts/run_migration.js
```

## Note
These scripts are for development/setup only.
Do not run in production without backup.
