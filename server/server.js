// WOLF HMS Server v2.2 - Hardened Cloud Deployment
console.log('DEBUG: SERVER.JS STARTING...');
const express = require('express'); // Force Restart 5 - Hardened
const path = require('node:path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { Pool } = require('pg');
const http = require('node:http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Phase 1: Troubleshooting Infrastructure
const healthRoutes = require('./routes/healthRoutes');
const { requestIdMiddleware, requestLoggerMiddleware, errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./services/Logger');
// [NEW] Structured Request Logger
const structuredRequestLogger = require('./middleware/requestLogger');

// Phase 2: Alerts & Recovery
const alertRoutes = require('./routes/alertRoutes');
const DatabaseRecovery = require('./services/DatabaseRecovery');

// Phase 3: Performance Monitoring
const metricsRoutes = require('./routes/metricsRoutes');
const { metricsMiddleware } = require('./middleware/metricsMiddleware');

// Phase 4: Remote Access & Support
const supportRoutes = require('./routes/supportRoutes');

// Phase 5: Self-Healing & AI
const selfhealRoutes = require('./routes/selfhealRoutes');
const SelfHealingService = require('./services/SelfHealingService');

// Multi-Tenancy: Tenant Resolution Middleware
const { resolveHospital } = require('./middleware/tenantResolver');

// Phase 6: AI Overwatch Monitoring
// const Overwatch = require('./services/OverwatchService');
// const overwatchRoutes = require('./routes/overwatchRoutes');

// Phase 7: Cloud Backup
// const cloudBackupRoutes = require('./routes/cloudBackupRoutes');

// Phase 6: Clinical Sentinel
const ClinicalSentinel = require('./services/ClinicalSentinel');
// setInterval(() => { ClinicalSentinel.startSurveillance(); }, 300000);

// Database Connection (Keep this to test DB)
const { pool } = require('./db');

// Startup Schema Migrations — adds missing columns safely
const { ensureSchema } = require('./utils/ensureSchema');
ensureSchema().catch(err => console.error('[Schema] Migration error:', err.message));


const { initEmailWorker } = require('./workers/emailWorker');

// Initialize Background Workers
try {
    // initEmailWorker();
    logger.info('Worker initialization skipped for dev (No Redis)');
} catch (err) {
    logger.error('Failed to start workers:', err);
    logger.error('Failed to start workers:', err);
}

// [NEW] Daily Bed Charge Cron
const { initCron } = require('./services/cron/dailyBedCharge');
try {
    initCron();
    logger.info('⏰ Daily Bed Charge Cron Initialized');
} catch (err) {
    logger.error('Failed to init Bed Charge Cron:', err);
}

// [ENTERPRISE] Nightly ERP Tally Sync Daemon
const { initERPCron } = require('./cron/eod_erp_sync');
try {
    initERPCron();
    logger.info('📊 Enterprise ERP Sync Cron Initialized');
} catch (err) {
    logger.error('Failed to init ERP Sync Cron:', err);
}

process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION:', err);
    // process.exit(1); // Optional: keep alive for debug? No, better to log and die.
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION:', reason);
});

const app = express();



// Trust proxy for Cloud Run (required for rate limiting behind load balancer)
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (dev mode)
        methods: ["GET", "POST"]
    }
});

// ============================================
// SECURITY MIDDLEWARE - Phase 1
// ============================================

// Helmet: Security headers (XSS, clickjacking, etc.)
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

app.use(cookieParser());

// Rate limiting: General API protection
const generalLimiter = rateLimit({
    windowMs: Number.parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: Number.parseInt(process.env.API_RATE_LIMIT_MAX) || 500, // 500 requests per 15 min
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
    windowMs: Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 1000, // 1000 requests per 15 min (Relaxed for Dev)
    message: { error: 'Too many login attempts, please try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false
});


// Apply general rate limit to all API routes
app.use('/api/', generalLimiter);
logger.info('DEBUG_STARTUP: Line 100 - Rate Limiters applied');

app.use(structuredRequestLogger); // Log all requests using Winston

logger.info('DEBUG_STARTUP: Applying CORS...');

// [EMERGENCY DIAGNOSTIC ROUTE] - Fix Schema Manually
app.get('/api/test/fix-users-schema', async (req, res) => {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id UUID');
        res.json({ success: true, message: "Checked/Added hospital_id column" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});




// [MIGRATION] Admin Recovery Console - Soft Delete & Audit Tables
app.get('/api/test/migrate-recovery-console', async (req, res) => {
    try {
        console.log('🔧 Running Admin Recovery Console Migration...');

        // 1. Add soft delete columns to patients
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_by INT`);
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS deletion_reason TEXT`);

        // 2. Add soft delete columns to admissions
        await pool.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        await pool.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_by INT`);
        await pool.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deletion_reason TEXT`);

        // 3. Create patient_history table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_history (
                id SERIAL PRIMARY KEY,
                patient_id INT,
                hospital_id INT,
                changed_by INT,
                changed_at TIMESTAMP DEFAULT NOW(),
                action VARCHAR(20) NOT NULL,
                before_data JSONB,
                after_data JSONB,
                reason TEXT,
                ip_address VARCHAR(45)
            )
        `);

        // 4. Create admin_audit_log table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id SERIAL PRIMARY KEY,
                hospital_id INT,
                user_id INT,
                username VARCHAR(255),
                role VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INT,
                entity_name VARCHAR(255),
                before_data JSONB,
                after_data JSONB,
                reason TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 5. Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_patient_history_patient ON patient_history(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_hospital ON admin_audit_log(hospital_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_date ON admin_audit_log(created_at DESC)`);

        console.log('✅ Admin Recovery Console Migration Complete');
        res.json({ success: true, message: "Admin Recovery Console migration complete - all tables created" });
    } catch (err) {
        console.error('Recovery Console Migration Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// --- TEMP MIGRATION TRIGGER --
app.get('/api/run-all-migrations-now', async (req, res) => {
    try {
        const fs = require('fs'); const path = require('path');
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        const resDb = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'migrations');`);
        let logs = [];
        if (!resDb.rows[0].exists) {
            logs.push('Creating migrations table...');
            await pool.query('CREATE TABLE migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, executed_at TIMESTAMP DEFAULT NOW());');
        }

        const executed = await pool.query('SELECT name FROM migrations');
        const executedNames = new Set(executed.rows.map(r => r.name));
        const pending = files.filter(f => !executedNames.has(f));
        logs.push(`Pending migrations: ${pending.length} files`);

        let success = 0; let failed = 0;
        for (const file of pending) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
                await pool.query(sql); await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                success++;
            } catch (e) { logs.push(`Failed ${file}: ${e.message}`); failed++; }
        }
        logs.push(`Finished. Success: ${success}, Failed: ${failed}`);
        res.json({ logs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// -----------------------------

app.get('/api/test/fix-settings-schema', async (req, res) => {
    try {
        // 1. Create table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hospital_settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) NOT NULL,
                value TEXT,
                hospital_id INTEGER, -- Removed FK constraint to prevent crashes if hospitals table is empty/mismatched
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 2. Add Unique Constraint
        /* 
           We use a DO block to safely add the constraint only if it doesn't exist.
           This is safer than relying on migration history.
        */
        await pool.query(`
            DO $$ BEGIN IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'hospital_settings_key_hospital_id_unique'
            ) THEN
                ALTER TABLE hospital_settings ADD CONSTRAINT hospital_settings_key_hospital_id_unique UNIQUE (key, hospital_id);
            END IF; END $$;
        `);

        // 3. Ensure Hospital ID 1 exists (Blind Fix)
        await pool.query(`
            INSERT INTO hospitals (id, code, name, subdomain) 
            VALUES (1, 'default', 'Kokila Hospital', 'kokila.wolfhms.web.app')
            ON CONFLICT (id) DO NOTHING;
        `);

        res.json({ success: true, message: "Fixed hospital_settings schema and ensured Hospital ID 1" });
    } catch (err) {
        console.error('Fix Schema Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// [EMERGENCY FIX] Fix payments table for OPD cancellation
app.get('/api/test/fix-payments-schema', async (req, res) => {
    try {
        // Add all required columns for OPD payments and cancellations
        await pool.query(`
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS visit_id INTEGER;
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_id INTEGER;
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2);
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP;
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS hospital_id INT;
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by INT;
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed';
        `);

        // Create indexes for faster lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_payments_visit_id ON payments(visit_id);
            CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
        `);

        res.json({ success: true, message: "Fixed payments table schema for OPD cancellation" });
    } catch (err) {
        console.error('Fix Payments Schema Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/test/fix-payments-type', async (req, res) => {
    try {
        await pool.query(`
            ALTER TABLE payments ALTER COLUMN patient_id TYPE VARCHAR(255) USING patient_id::varchar;
        `);
        res.json({ success: true, message: "Fixed payments table: patient_id converted to VARCHAR" });
    } catch (err) {
        console.error('Fix Payments Type Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// [FIX] Duplicate Bed Assignments - Keep only latest admission per patient
app.get('/api/test/fix-duplicate-admissions', async (req, res) => {
    try {
        console.log('🔧 Fixing duplicate bed assignments...');

        // Find patients with multiple active admissions
        const duplicates = await pool.query(`
            SELECT patient_id, patient_name, COUNT(*) as count
            FROM admissions
            WHERE status = 'Admitted'
            GROUP BY patient_id, patient_name
            HAVING COUNT(*) > 1
        `);

        if (duplicates.rows.length === 0) {
            return res.json({ success: true, message: 'No duplicate admissions found', fixed: 0 });
        }

        console.log(`Found ${duplicates.rows.length} patients with duplicate admissions`);

        let fixed = 0;
        const details = [];

        for (const dup of duplicates.rows) {
            // Get all active admissions for this patient, ordered by ID (newest first)
            const admissions = await pool.query(`
                SELECT id, bed_number, admission_date
                FROM admissions
                WHERE patient_id = $1 AND status = 'Admitted'
                ORDER BY id DESC
            `, [dup.patient_id]);

            if (admissions.rows.length > 1) {
                // Keep the first one (latest), discharge the rest
                const keepAdmission = admissions.rows[0];
                const dischargingIds = admissions.rows.slice(1).map(a => a.id);

                // Set others to discharged
                await pool.query(`
                    UPDATE admissions 
                    SET status = 'Discharged', 
                        discharge_date = NOW(),
                        discharge_notes = 'Auto-fixed: Duplicate admission cleanup'
                    WHERE id = ANY($1)
                `, [dischargingIds]);

                // Free up the beds
                const bedsToFree = admissions.rows.slice(1).map(a => a.bed_number);
                await pool.query(`
                    UPDATE beds SET status = 'Available', current_patient_id = NULL
                    WHERE bed_number = ANY($1)
                `, [bedsToFree]);

                fixed += dischargingIds.length;
                details.push({
                    patient: dup.patient_name,
                    kept_admission: keepAdmission.id,
                    kept_bed: keepAdmission.bed_number,
                    discharged_admissions: dischargingIds,
                    freed_beds: bedsToFree
                });
            }
        }

        console.log(`✅ Fixed ${fixed} duplicate admissions`);
        res.json({
            success: true,
            message: `Fixed ${fixed} duplicate admissions`,
            fixed,
            details
        });
    } catch (err) {
        console.error('Fix Duplicate Admissions Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// [FIX] Sync Beds Table - Clear orphaned patient references
app.get('/api/test/sync-beds', async (req, res) => {
    try {
        console.log('🔧 Syncing beds with active admissions...');

        // Find all beds marked as Occupied
        const occupiedBeds = await pool.query(`
            SELECT id, bed_number, current_patient_id, status 
            FROM beds 
            WHERE status = 'Occupied' OR current_patient_id IS NOT NULL
        `);

        let fixed = 0;
        const details = [];

        for (const bed of occupiedBeds.rows) {
            // Check if there's an active admission for this bed
            const activeAdmission = await pool.query(`
                SELECT id, patient_name, status 
                FROM admissions 
                WHERE bed_number = $1 AND status = 'Admitted'
                LIMIT 1
            `, [bed.bed_number]);

            if (activeAdmission.rows.length === 0) {
                // No active admission - clear the bed
                await pool.query(`
                    UPDATE beds 
                    SET status = 'Available', current_patient_id = NULL
                    WHERE id = $1
                `, [bed.id]);

                fixed++;
                details.push({
                    bed: bed.bed_number,
                    was_marked: bed.status,
                    had_patient_id: bed.current_patient_id,
                    action: 'Cleared - no active admission found'
                });
            }
        }

        console.log(`✅ Synced ${fixed} beds`);
        res.json({
            success: true,
            message: `Synced ${fixed} beds - cleared orphaned patient references`,
            fixed,
            details
        });
    } catch (err) {
        console.error('Sync Beds Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// [BILLING UNIFICATION] Migrate OPD Payments to Invoices (Self-Healing)
app.post('/api/test/migrate-opd-to-invoices', async (req, res) => {
    try {
        console.log('🔧 Starting OPD Payments → Invoices Migration...');

        // 1. Ensure invoice_id column exists on payments table
        await pool.query(`
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id INTEGER;
        `);

        // 2. Find OPD payments (have visit_id) that don't have an invoice
        const payments = await pool.query(`
            SELECT p.id, p.patient_id, p.visit_id, p.amount, 
                   COALESCE(p.received_at, NOW()) as payment_date, p.hospital_id,
                   ov.doctor_id, u.username as doctor_name, u.department
            FROM payments p
            JOIN opd_visits ov ON p.visit_id = ov.id
            LEFT JOIN users u ON ov.doctor_id = u.id
            WHERE p.visit_id IS NOT NULL
              AND p.invoice_id IS NULL
        `);

        console.log(`Found ${payments.rows.length} OPD payments without invoices`);

        let created = 0, skipped = 0, errors = [];

        for (const pmt of payments.rows) {
            try {
                // Check if invoice already exists for this date/amount (idempotent)
                const existing = await pool.query(
                    `SELECT id FROM invoices WHERE patient_id = $1 
                     AND generated_at::date = $2::date AND total_amount = $3`,
                    [pmt.patient_id, pmt.payment_date, pmt.amount]
                );

                let invoiceId;

                if (existing.rows.length === 0) {
                    // Create invoice
                    const inv = await pool.query(
                        `INSERT INTO invoices 
                         (patient_id, total_amount, paid_amount, status, generated_at, hospital_id)
                         VALUES ($1, $2, $3, 'Paid', $4, $5)
                         RETURNING id`,
                        [pmt.patient_id, pmt.amount, pmt.amount, pmt.payment_date, pmt.hospital_id || 1]
                    );
                    invoiceId = inv.rows[0].id;

                    // Create invoice item
                    const doctorPart = pmt.doctor_name ? ` - Dr. ${pmt.doctor_name}` : '';
                    const deptPart = pmt.department ? ` (${pmt.department})` : '';
                    const description = `OPD Consultation${doctorPart}${deptPart}`;
                    await pool.query(
                        `INSERT INTO invoice_items 
                         (invoice_id, description, quantity, unit_price, total_price)
                         VALUES ($1, $2, 1, $3, $4)`,
                        [invoiceId, description, pmt.amount, pmt.amount]
                    );

                    created++;
                } else {
                    invoiceId = existing.rows[0].id;
                    skipped++;
                }

                // Link payment to invoice
                await pool.query(
                    `UPDATE payments SET invoice_id = $1 WHERE id = $2`,
                    [invoiceId, pmt.id]
                );

            } catch (err) {
                errors.push({ payment_id: pmt.id, error: err.message });
            }
        }

        console.log(`✅ Migration complete: ${created} invoices created, ${skipped} already existed`);

        res.json({
            success: true,
            message: `Migrated ${created} OPD payments to invoices`,
            stats: {
                total_payments_scanned: payments.rows.length,
                invoices_created: created,
                already_existed: skipped,
                errors: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error('Migration Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/test/delete-uhids-specific', async (req, res) => {
    try {
        const targetUHIDs = [
            'KOKILA-0011/2026',
            'KOKILA-0006/2026',
            'KOKILA-0007/2026',
            'KOKILA-0009/2026',
            'KOKILA-0002/2026'
        ];

        // 1. Get Patient IDs
        const pRes = await pool.query('SELECT id, uhid FROM patients WHERE uhid = ANY($1)', [targetUHIDs]);
        const pIds = pRes.rows.map(r => r.id);

        if (pIds.length === 0) return res.json({ success: true, message: "No patients found with those UHIDs" });

        // 2. Delete Dependencies (Manual Cascade)
        // Payments
        await pool.query('DELETE FROM payments WHERE patient_id = ANY($1)', [pIds]);
        // Vitals
        await pool.query('DELETE FROM vitals_logs WHERE patient_id = ANY($1)', [pIds]);
        // Lab Requests
        await pool.query('DELETE FROM lab_requests WHERE patient_id = ANY($1)', [pIds]);
        // Prescriptions (via care_tasks?) - Just in case
        await pool.query('DELETE FROM care_tasks WHERE patient_id = ANY($1)', [pIds]);
        // OPD Visits
        await pool.query('DELETE FROM opd_visits WHERE patient_id = ANY($1)', [pIds]);

        // 3. Delete Patients
        await pool.query('DELETE FROM patients WHERE id = ANY($1)', [pIds]);

        res.json({
            success: true,
            message: `Deleted ${pIds.length} patients and related records.`,
            deletedUHIDs: pRes.rows.map(r => r.uhid)
        });
    } catch (err) {
        console.error('Deletion Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Middleware
// Simplified for debugging
// Middleware (Robust Setup)

// [DEBUG] Startup Error Storage
const fs = require('node:fs');
const STARTUP_ERROR_FILE = '/tmp/startup_error.txt';

// [DEBUG] Route to fetch startup error
// Must be BEFORE other routes/middleware to act as emergency hatch
app.get('/api/debug/startup-error', (req, res) => {
    if (fs.existsSync(STARTUP_ERROR_FILE)) {
        const error = fs.readFileSync(STARTUP_ERROR_FILE, 'utf8');
        res.json({ success: false, error: error });
    } else {
        res.json({ success: true, message: "No startup error recorded. System Healthy." });
    }
});

// [EMERGENCY CLEAR] Fix Schema and Clear All Active Emergencies
app.get('/api/debug/clear-emergencies', async (req, res) => {
    try {
        console.log('🚨 Fixing emergency_logs schema and clearing active emergencies...');

        // 1. Fix schema - add missing columns
        await pool.query(`ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolved_by INTEGER`);
        await pool.query(`ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`);
        await pool.query(`ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS hospital_id INTEGER`);

        // 2. Force resolve all active emergencies
        const result = await pool.query(`
            UPDATE emergency_logs 
            SET status = 'Resolved', resolved_at = NOW()
            WHERE status = 'Active'
            RETURNING id, code, location
        `);

        console.log(`✅ Cleared ${result.rowCount} active emergencies`);

        res.json({
            success: true,
            message: `Cleared ${result.rowCount} active emergencies`,
            resolved: result.rows
        });
    } catch (error) {
        console.error('Clear Emergencies Failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// [SECURITY] Manual CORS DISABLED - Switching to standard package
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
//     if (req.method === 'OPTIONS') {
//         return res.sendStatus(200);
//     }
//     next();
// });

// Enable Standard CORS
app.use(cors({
    origin: '*', // Allow all origins for dev/cloud
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'x-hospital-id']
}));
logger.info('DEBUG_STARTUP: Standard CORS Applied');

logger.info('DEBUG_STARTUP: Applying Body Parser...');
app.use(express.json({ limit: '10mb' })); // Limit body size
logger.info('DEBUG_STARTUP: Line 133 - JSON Body Parser applied');
// Limit body size


// [DEPLOYMENT FIX] Serve static files from local 'public' (Docker/Production) or relative '../client/dist' (Dev)
const localPublic = path.join(__dirname, 'public');
const relativeDist = path.join(__dirname, '../client/dist');

if (require('node:fs').existsSync(localPublic)) {
    logger.info('📂 Serving frontend from local ./public (Production Mode)');
    app.use(express.static(localPublic));
    // SPA Fallback for ./public would be handled here, or generic 404
} else {
    logger.info('📂 Serving frontend from ../client/dist (Dev Mode)');
    app.use(express.static(relativeDist));
}

// Attach io to request for controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Phase 1: Request ID + Logging Middleware
app.use(requestIdMiddleware);
// Reuse existing requestLoggerMiddleware or rely on winston middleware? 
// Keeping both might be duplicate but specific middleware does specific things.
// Will disable the old one to avoid noise if redundant, or keep if it does request ID tagging.
app.use(requestLoggerMiddleware);

// Phase 2 Multi-Tenancy: Resolve hospital from subdomain/JWT
app.use(resolveHospital);
logger.info('DEBUG_STARTUP: Tenant Resolution middleware applied');

// Phase 3: Metrics Collection Middleware
app.use(metricsMiddleware);
logger.info('DEBUG_STARTUP: Line 162 - Metrics Middleware applied');

// Health Check Routes (Public - No Auth Required)
logger.debug('DEBUG: Middleware Checkpoint 1 - Health');
app.use('/api/health', healthRoutes);

logger.debug('DEBUG: Middleware Checkpoint 2 - Alerts');
// Alert Routes (Public dashboard, admin for actions)
app.use('/api/alerts', alertRoutes);

logger.debug('DEBUG: Middleware Checkpoint 3 - Metrics');
// Metrics Routes (Public dashboard)
app.use('/api/metrics', metricsRoutes);

logger.debug('DEBUG: Middleware Checkpoint 4 - Support');
// Support Portal Routes (Public dashboard)
app.use('/api/support', supportRoutes);

logger.debug('DEBUG: Middleware Checkpoint 5 - SelfHeal');
// Self-Healing Routes (Admin dashboard)
app.use('/api/selfheal', selfhealRoutes);

logger.debug('DEBUG: Middleware Checkpoint 6 - Overwatch Skipped');
// AI Overwatch Routes (Monitoring dashboard)
// console.error('DEBUG: Mounting Overwatch Routes...');
// app.use('/api/overwatch', overwatchRoutes);
// console.error('DEBUG: Overwatch Routes Mounted');

// Initialize AI Overwatch
// Overwatch.initSentry(app);
// Overwatch.initTelegramBot();
logger.info('AI Overwatch initialized (Skipped)');



// Phase 6: Clinical Sentinel
/*
try {
    logger.info('DEBUG: Require ClinicalSentinel...');
    const ClinicalSentinel = require('./services/ClinicalSentinel');
    // Run sweep every 5 minutes (300000 ms)
    setInterval(() => {
        try {
            logger.info('Clinical Sentinel Start Sweep');
            ClinicalSentinel.startSurveillance();
        } catch (e) {
            logger.error('Clinical Sentinel Sweep Failed', e);
        }
    }, 300000);
    logger.info('DEBUG: Clinical Sentinel activated');
} catch (e) {
    logger.error('CRITICAL: Clinical Sentinel Failed to Load', e);
}
*/

// Phase 5: The Universal Translator (HL7 TCP Server)
// console.error('DEBUG: Require HL7Receiver...');
// const HL7Receiver = require('./services/HL7Receiver');
// try {
//     HL7Receiver.start(6001); // Changed to 6001 to avoid collision
//     console.error('DEBUG: HL7 Receiver started');
// } catch (e) { console.error('DEBUG: HL7 Start Error', e); }


logger.info('DEBUG: Skipping DB Recovery & IO (Isolation Mode)');
// [SECURITY] Removed dangerous /api/fix-patients endpoint.
// Database Connection (Skipped)
// DatabaseRecovery.init(pool);
globalThis.io = io;
logger.info('DEBUG: IO Assigned');

// Wolf Video: Initialize WebRTC Signaling on Socket.IO
try {
    initializeSignaling(io, pool);
    logger.info('📹 Wolf Video: WebRTC Signaling initialized');
} catch (err) {
    logger.error('Failed to initialize video signaling:', err);
}

// Wolf Runner: Delivery Order Tracking Rooms
io.on('connection', (socket) => {
    // Patient joins order tracking room
    socket.on('join_order_tracking', (data) => {
        if (data && data.orderId) {
            const room = `order_${data.orderId}`;
            socket.join(room);
            logger.info(`[TRACKING] Patient joined room ${room}`);
        }
    });

    // Patient leaves order tracking room
    socket.on('leave_order_tracking', (data) => {
        if (data && data.orderId) {
            const room = `order_${data.orderId}`;
            socket.leave(room);
            logger.info(`[TRACKING] Patient left room ${room}`);
        }
    });
});

// Phase 5: Start Self-Healing Service (check every 2 minutes)
// SelfHealingService.start(120000);
// console.log('TRACE: SelfHealing Started');

logger.info('DEBUG: Defining Root Route...');
// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Wolf HMS API is running', status: 'OK', version: '1.0.5' });
});
logger.info('DEBUG: Root Route Defined');

// Import Routes
logger.info('📦 Loading all routes...');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const opdRoutes = require('./routes/opdRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const patientRoutes = require('./routes/patientRoutes');
const labRoutes = require('./routes/labRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const wardRoutes = require('./routes/wardRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const financeRoutes = require('./routes/financeRoutes');
const clinicalRoutes = require('./routes/clinicalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // [FIX] import missing routes
const migrationRoutes = require('./routes/migration_routes');
const corporateRoutes = require('./routes/corporateRoutes'); // [ENTERPRISE] B2B Billing

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes); // [FIX] Mount dashboard routes
app.use('/api/migration', migrationRoutes); // [NEW] Wolf Migrator Routes
app.use('/api/corporate', corporateRoutes); // [ENTERPRISE]
app.use('/api/v1/corporate', corporateRoutes); // [ENTERPRISE] Support v1 prefix as well
const radiologyOrderRoutes = require('./routes/radiologyOrderRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/admin', adminRoutes);

// Phase 11: Radiology RIS
app.use('/api/ris', radiologyOrderRoutes);
const dicomMockRoutes = require('./routes/dicomMockRoutes');
app.use('/api/dicom', dicomMockRoutes);
const pacsWebhookRoutes = require('./routes/pacsWebhookRoutes');
app.use('/api/pacs', pacsWebhookRoutes);
const nurseRoutes = require('./routes/nurseRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const doctorAnalyticsRoutes = require('./routes/doctorAnalyticsRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const bloodBankRoutes = require('./routes/bloodBankRoutes');
const automationRoutes = require('./routes/automationRoutes');
const tpaRoutes = require('./routes/tpaRoutes');
const carePlanRoutes = require('./routes/carePlanRoutes');
const transitionRoutes = require('./routes/transitionRoutes');
const orderSetRoutes = require('./routes/orderSetRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const instrumentRoutes = require('./routes/instrumentRoutes');
const labTestParamsRoutes = require('./routes/labTestParamsRoutes');
const cssdRoutes = require('./routes/cssdRoutes');
const radiologyRoutes = require('./routes/radiologyRoutes');
const smsRoutes = require('./routes/smsRoutes');
// const deviceRoutes = require('./routes/deviceRoutes'); // Needs serialport
const rosterRoutes = require('./routes/rosterRoutes');
// const securityRoutes = require('./routes/securityRoutes'); // Needs @turf
// const paymentRoutes = require('./routes/paymentRoutes'); // Needs razorpay
const posRoutes = require('./routes/posRoutes');
const auditRoutes = require('./routes/auditRoutes');
const bedRoutes = require('./routes/bedRoutes');
const preauthRoutes = require('./routes/preauthRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');
const wardPassRoutes = require('./routes/wardPassRoutes');
// const visitorRoutes = require('./routes/visitorRoutes'); // Needs serialport
const hospitalRoutes = require('./routes/hospitalRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const specialistRoutes = require('./routes/specialistRoutes'); // Visiting Doctor Billing
const treatmentPackageRoutes = require('./routes/treatmentPackageRoutes'); // All-inclusive packages
const chargesRoutes = require('./routes/chargesRoutes'); // Centralized Billing Queue
// const totpRoutes = require('./routes/totpRoutes'); // Needs otpauth

// Wolf Video: Pure WebRTC Video Calling
const telehealthRoutes = require('./routes/telehealthRoutes');
const { initializeSignaling } = require('./services/videoSignaling');
logger.info('✅ All routes imported');


// =============================================
// MOUNT ALL API ROUTES
// =============================================
logger.info('📦 Mounting all API routes...');

// [CRITICAL] Inline Sync Endpoint for robust migration
app.post('/api/sync/restore', async (req, res) => {
    const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';
    const { secret, hospitals, users, patients } = req.body;

    if (secret !== SYNC_SECRET) return res.status(403).json({ message: 'Invalid Secret' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let log = [];

        // Hospitals
        if (hospitals) {
            for (const h of hospitals) {
                await client.query(`
                    INSERT INTO hospitals (id, code, name, subscription_tier) VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name, subscription_tier=EXCLUDED.subscription_tier
                `, [h.id, h.code, h.name, h.subscription_tier]);
            }
            log.push(`Synced ${hospitals.length} hospitals`);
        }

        // Users
        if (users) {
            for (const u of users) {
                await client.query(`
                    INSERT INTO users (id, username, email, password, role, hospital_id, is_active, full_name, department)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO UPDATE SET 
                        username = EXCLUDED.username, email = EXCLUDED.email, password = EXCLUDED.password,
                        role = EXCLUDED.role, hospital_id = EXCLUDED.hospital_id, is_active = EXCLUDED.is_active
                `, [u.id, u.username, u.email, u.password, u.role, u.hospital_id, u.is_active, u.full_name, u.department]);
            }
            log.push(`Synced ${users.length} users`);
        }

        // Patients
        if (patients) {
            for (const p of patients) {
                // Check if history_json is valid JSON or string
                const history = typeof p.history_json === 'object' ? JSON.stringify(p.history_json) : p.history_json;
                await client.query(`
                    INSERT INTO patients (id, name, dob, gender, phone, address, history_json)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone
                `, [p.id, p.name, p.dob, p.gender, p.phone, p.address, history]);
            }
            log.push(`Synced ${patients.length} patients`);
        }

        await client.query('COMMIT');
        res.json({ success: true, log });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Auth (with rate limiting)
app.use('/api/sync', require('./routes/syncRoutes')); // Data Migration
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient-auth', require('./routes/patientAuthRoutes')); // Self-hosted OTP Auth (No Firebase)
app.use('/api/users', authLimiter, userRoutes);
app.use('/api/2fa', require('./routes/totpRoutes')); // Authenticator App 2FA

// Core HMS Routes
app.use('/api/patient-merge', require('./routes/patientMergeRoutes')); // [G1] Patient Merge & Duplicate Detection (dedicated prefix to avoid /:id conflict)
app.use('/api/patients/app', patientRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/barcode', require('./routes/barcodeRoutes')); // [G2] Wristband & Patient Card Barcodes
app.use('/api/abdm', require('./routes/abdmRoutes')); // [G3] ABDM Consent & Cross-Hospital Linking
app.use('/api/opd', opdRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/alerts', alertRoutes); // [INTEGRATION] - Phase 1 Quick Win
app.use('/api/lab', labRoutes);
app.use('/api/lab-params', labTestParamsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/radiology', radiologyRoutes);
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/ot', require('./routes/otRoutes')); // OT (Operating Theatre)
app.use('/api/emergency', emergencyRoutes);

// Ward & Nursing
app.use('/api/ward', wardRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/transitions', transitionRoutes);
app.use('/api/order-sets', orderSetRoutes);

// Finance & Billing
app.use('/api/finance', financeRoutes);
app.use('/api/tpa', tpaRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/payments', require('./routes/paymentRoutes')); // Needs razorpay - Enabled
app.use('/api/preauth', preauthRoutes);
app.use('/api/packages', treatmentPackageRoutes); // Treatment Packages
app.use('/api/ai', require('./routes/enterpriseAIRoutes')); // Phase 8: Enterprise AI (4 Pillars)
app.use('/api/charges', chargesRoutes); // Centralized Billing Queue (Gold Standard)

// [WOLF VAULT] HCX/TPA Webhook Router - Async callbacks with correlation ID routing
const hcxWebhookController = require('./controllers/HcxWebhookController');
app.use('/api/callbacks/hcx', hcxWebhookController);

// [WOLF VAULT] Admin Credential Management
const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/admin/vault', vaultRoutes);

// [WOLF VAULT] Insurance Finance Dashboard & Split Billing
const insuranceFinanceRoutes = require('./routes/insuranceFinanceRoutes');
app.use('/api/finance/insurance', insuranceFinanceRoutes);

// [PMJAY] HBP 2.0 Rate Lookup API
const pmjayRateRoutes = require('./routes/pmjayRateRoutes');
app.use('/api/pmjay/hbp', pmjayRateRoutes);
logger.info('📦 PMJAY HBP 2.0 Routes mounted at /api/pmjay/hbp');

// [PHASE H] Government Health Schemes — CGHS, ECHS, CAPF
const govtSchemeRoutes = require('./routes/govtSchemeRoutes');
app.use('/api/govt-schemes', govtSchemeRoutes);
logger.info('🏥 Govt Schemes Routes mounted at /api/govt-schemes (CGHS/ECHS/CAPF)');

// [PMJAY] Claims Management API
const pmjayClaimRoutes = require('./routes/pmjayClaimRoutes');
app.use('/api/pmjay/claims', pmjayClaimRoutes);
logger.info('📋 PMJAY Claims Routes mounted at /api/pmjay/claims');

app.use('/api/telehealth', telehealthRoutes); // Wolf Video: Pure WebRTC Consultations
app.use('/api/home-collection', require('./routes/homeCollectionRoutes')); // Wolf Path: Home Collection Logistics
app.use('/api/ipd', require('./routes/ipdPatientRoutes')); // My Stay: IPD Patient Dashboard

// Wolf Care: Medicine Ordering & Delivery
app.use('/api/medicine-orders', require('./routes/medicineOrderRoutes')); // Prescription-based ordering
app.use('/api/unified-cart', require('./routes/unifiedCartRoutes')); // Unified cart checkout (medicines + lab tests)
app.use('/api/addresses', require('./routes/patientAddressRoutes')); // Patient delivery addresses
app.use('/api/home-lab', require('./routes/homeLabRoutes')); // Home Lab expanded dashboard
app.use('/api/locations', require('./routes/locationRoutes')); // Staff location trail & online staff
logger.info('🚀 Wolf Care Routes mounted: medicine-orders, unified-cart, addresses, home-lab, locations');

// Admin: Database migrations (protected by secret)
app.use('/api/admin', require('./routes/adminMigrationRoutes'));


// Admin & Settings
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/migrations', require('./routes/migrationRoutes'));
app.use('/api/settings', settingsRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/specialists', specialistRoutes); // Visiting Doctor Billing

// Staff & Equipment
app.use('/api/doctor', doctorAnalyticsRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/cssd', cssdRoutes);

// Blood Bank
app.use('/api/blood-bank', bloodBankRoutes);
// app.use('/api/mortuary', require('./routes/mortuaryRoutes'));

// Physiotherapy (Tier 2)
const physioRoutes = require('./routes/physioRoutes');
app.use('/api/physio', physioRoutes);

// Medical Records / HIM (Tier 3)
const medicalRecordsRoutes = require('./routes/medicalRecordsRoutes');
app.use('/api/him', medicalRecordsRoutes);

// Dietary (Tier 2)
const dietaryRoutes = require('./routes/dietaryRoutes');
app.use('/api/dietary', dietaryRoutes);

// AI & Automation
app.use('/api/ai', aiRoutes);
app.use('/api/ai-billing', require('./routes/aiBillingRoutes'));
app.use('/api/automation', automationRoutes);

// Security (Wolf Security 2.0)
// app.use('/api/security', securityRoutes); // Disabled: needs @turf

// app.use('/api/devices', deviceRoutes); // Disabled: needs serialport
app.use('/api/sms', smsRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/ward-access', wardPassRoutes);
// app.use('/api/visitors', visitorRoutes); // Disabled: needs serialport
app.use('/api/hospitals', hospitalRoutes);

// Admin Recovery Console (DPDP Act Compliant Patient Management)
const adminRecoveryRoutes = require('./routes/adminRecoveryRoutes');
app.use('/api/admin/recovery', adminRecoveryRoutes);

// SaaS Platform Control Plane
const platformRoutes = require('./routes/platformRoutes');
app.use('/api/platform', platformRoutes);


// MFA (Multi-Factor Authentication)
// const mfaRoutes = require('./routes/mfaRoutes');
// app.use('/api/mfa', mfaRoutes);

// App Build System (White-Label APK Generation)
// const appBuildRoutes = require('./routes/appBuildRoutes');
// app.use('/api/platform/builds', appBuildRoutes);

logger.info('✅ All 43 API route groups mounted (including Platform, MFA, App Builds)');

// ============================================
// SERVE FRONTEND (Monolith Deployment)
// ============================================
// path is already imported at top? Checking... if not, I'll keep it but ensure unique name if needed.
// Actually, I'll just check if it's imported at top.
// Serve static files from the React app - COPIED TO LOCAL DIST
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files (logos, documents, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res, next) => {
    // Skip API routes (though they should be matched above, this is safety)
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ============================================
// ERROR HANDLING MIDDLEWARE - MUST BE LAST
// ============================================

// 404 Handler - Catches unmatched routes
app.use(notFoundHandler);

// Global Error Handler - Catches all thrown/passed errors
app.use(errorHandler);

logger.info('✅ Error handling middleware applied');

const socketHandler = require('./services/socketHandler');
socketHandler(io);


// Start Server
// Instrument / LIS Routes
app.use('/api/instruments', require('./routes/instrumentRoutes'));

const PORT = process.env.PORT || 8080;
logger.info('DEBUG: PORT IS ' + PORT);



logger.info('DEBUG: FORCE STARTING SERVER (SKIPPED MAIN CHECK)');
const MigrationService = require('./services/MigrationService');



// [CRITICAL FIX] Synchronous Startup with Crash Report
async function startServer() {
    try {
        logger.info('🔄 Checking DB Connection...');
        await pool.query('SELECT NOW()');
        logger.info('✅ DB Connected.');

        try {
            logger.info('🔄 Running Migrations...');
            await MigrationService.runMigrations();
            logger.info('✅ Migrations Check Complete.');
        } catch (error_) {
            logger.warn(`⚠️ Migration Error (Non-Fatal): ${error_.message}`);
            // Continue to ensureAdmins - it has CREATE TABLE logic!
        }

        logger.info('🔄 Seeding Admin Users (Self-Healing)...');
        const { ensureAdminUsers } = require('./utils/ensureAdmins');
        await ensureAdminUsers();
        logger.info('✅ Admin Seeding Complete.');

    } catch (err) {
        logger.error('💥 CRITICAL STARTUP ERROR:', err);
        // Write to file for retrieval
        fs.writeFileSync(STARTUP_ERROR_FILE, `TIME: ${new Date().toISOString()}\nERROR: ${err.message}\nSTACK: ${err.stack}`);
        // Do NOT exit. Allow server to start so we can read the error.
    }

    // Always start listening (Zombie Mode allowed for debugging)
    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Server running on port ${PORT}`);
    });
}

startServer();


module.exports = { app, pool, io };