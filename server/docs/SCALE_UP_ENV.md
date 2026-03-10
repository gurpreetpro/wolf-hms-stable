# Wolf HMS Scale-Up: Environment Variables

## Database Configuration (Phase 1)

### Primary Database (Writes)
```env
# Cloud SQL instance for INSERT, UPDATE, DELETE operations
DB_HOST=/cloudsql/your-project:asia-south1:wolf-primary
DB_USER=wolf_app
DB_PASSWORD=your_secure_password
DB_NAME=wolf_hms
DB_PORT=5432
DB_SSL=true

# Pool settings
DB_POOL_SIZE=20
```

### Read Replica (Reads)
```env
# Cloud SQL read replica for SELECT queries
# If not set, primary pool is used for all operations
DB_REPLICA_HOST=/cloudsql/your-project:asia-south1:wolf-replica

# For local development (no replica)
# Simply don't set DB_REPLICA_HOST and primary will be used
```

## Setting Up Read Replicas in GCP

### Step 1: Create Read Replica
```bash
gcloud sql instances create wolf-replica \
  --master-instance-name=wolf-primary \
  --region=asia-south1 \
  --tier=db-custom-2-7680 \
  --availability-type=zonal
```

### Step 2: Get Connection Name
```bash
gcloud sql instances describe wolf-replica --format="value(connectionName)"
# Output: your-project:asia-south1:wolf-replica
```

### Step 3: Update Cloud Run Environment
```bash
gcloud run services update wolf-hms \
  --set-env-vars="DB_REPLICA_HOST=/cloudsql/your-project:asia-south1:wolf-replica" \
  --region=asia-south1
```

## Connection Pooling (PgBouncer via Cloud SQL Proxy)

### Enable in GCP Console
1. Go to Cloud SQL → your instance
2. Click "Connections" 
3. Enable "Private IP" for better performance
4. Enable "Connection pooling" (uses PgBouncer internally)
5. Set pool mode to "Transaction" for best results

### Connection String Format (with pooling)
```
postgres://user:password@/database?host=/cloudsql/project:region:instance
```

## Health Check Endpoint

The new dbPools module exposes a health check:

```javascript
// In your server.js or health route
const { healthCheck } = require('./db');

app.get('/api/health/db', async (req, res) => {
    const status = await healthCheck();
    res.json(status);
});

// Response:
// {
//   "primary": true,
//   "replica": true,
//   "timestamp": "2026-01-13T14:00:00.000Z"
// }
```

## Running RLS Indexes Migration

### Option 1: Direct psql
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f server/prisma/migrations/add_rls_indexes.sql
```

### Option 2: Via Prisma
```bash
npx prisma db execute --file server/prisma/migrations/add_rls_indexes.sql
```

### Option 3: Via Cloud SQL Studio
1. Open Cloud SQL → your instance
2. Click "Cloud SQL Studio"
3. Copy-paste the SQL from add_rls_indexes.sql
4. Execute

## Verification

After running the migration, verify indexes with:
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%hospital%' 
ORDER BY tablename;
```

Expected output: 25+ indexes created across all major tables.
