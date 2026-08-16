/**
 * fix_crawler_schema_gaps.js
 * WOLF HMS — System Crawler Gap Remediation
 * 
 * This migration script eliminates crashes found by the system crawler:
 *  1. Creates 6 missing tables (IF NOT EXISTS)
 *  2. Adds 7 missing columns to existing tables (IF NOT EXISTS)
 *  3. Patches 2 production code bugs
 * 
 * Usage: node tests/load/fix_crawler_schema_gaps.js
 */

const { primaryPool } = require('../../config/dbPools');
const fs = require('fs');
const path = require('path');

// ─── TABLE CREATIONS ───────────────────────────────────────

async function createMissingTables() {
    console.log('\n🔨 STEP 1: Creating missing tables...\n');

    const tables = [
        {
            name: 'instrument_comm_log',
            ddl: `
                CREATE TABLE IF NOT EXISTS instrument_comm_log (
                    id SERIAL PRIMARY KEY,
                    instrument_id INTEGER,
                    connection_type VARCHAR(20),
                    raw_message TEXT,
                    parsed_data JSONB DEFAULT '{}',
                    direction VARCHAR(20),
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    hospital_id INTEGER
                )
            `
        },
        {
            name: 'price_change_requests',
            ddl: `
                CREATE TABLE IF NOT EXISTS price_change_requests (
                    id SERIAL PRIMARY KEY,
                    item_id INTEGER,
                    item_type VARCHAR(50),
                    old_price NUMERIC(10,2),
                    new_price NUMERIC(10,2),
                    reason TEXT,
                    status VARCHAR(20) DEFAULT 'Pending',
                    requested_by INTEGER,
                    approved_by INTEGER,
                    denied_reason TEXT,
                    requested_at TIMESTAMP DEFAULT NOW(),
                    resolved_at TIMESTAMP,
                    hospital_id INTEGER
                )
            `
        },
        {
            name: 'emergency_events',
            ddl: `
                CREATE TABLE IF NOT EXISTS emergency_events (
                    id SERIAL PRIMARY KEY,
                    event_code VARCHAR(20),
                    event_type VARCHAR(50),
                    location VARCHAR(100),
                    severity VARCHAR(20) DEFAULT 'Medium',
                    description TEXT,
                    triggered_by INTEGER,
                    status VARCHAR(20) DEFAULT 'Active',
                    triggered_at TIMESTAMP DEFAULT NOW(),
                    resolved_at TIMESTAMP,
                    resolved_by INTEGER,
                    resolution_notes TEXT,
                    hospital_id INTEGER
                )
            `
        },
        {
            name: 'cssd_batches',
            ddl: `
                CREATE TABLE IF NOT EXISTS cssd_batches (
                    id SERIAL PRIMARY KEY,
                    batch_number VARCHAR(50),
                    cycle_type VARCHAR(30),
                    sterilizer_id VARCHAR(50),
                    operator_id INTEGER,
                    start_time TIMESTAMP DEFAULT NOW(),
                    end_time TIMESTAMP,
                    cycle_duration_minutes INTEGER,
                    temperature_reached NUMERIC(5,1),
                    pressure_reached NUMERIC(6,2),
                    biological_indicator BOOLEAN DEFAULT false,
                    chemical_indicator BOOLEAN DEFAULT false,
                    bowie_dick_test BOOLEAN,
                    status VARCHAR(30) DEFAULT 'In Progress',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    hospital_id INTEGER
                )
            `
        },
        {
            name: 'rehab_sessions',
            ddl: `
                CREATE TABLE IF NOT EXISTS rehab_sessions (
                    id SERIAL PRIMARY KEY,
                    patient_id UUID,
                    admission_id INTEGER,
                    session_type VARCHAR(50),
                    therapist_id INTEGER,
                    scheduled_time TIMESTAMP,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    duration_minutes INTEGER,
                    exercises_performed JSONB DEFAULT '[]',
                    pain_pre_score INTEGER,
                    pain_post_score INTEGER,
                    rom_pre JSONB DEFAULT '{}',
                    rom_post JSONB DEFAULT '{}',
                    status VARCHAR(20) DEFAULT 'Scheduled',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    hospital_id INTEGER
                )
            `
        },
        {
            name: 'services',
            ddl: `
                CREATE TABLE IF NOT EXISTS services (
                    id SERIAL PRIMARY KEY,
                    service_code VARCHAR(50) UNIQUE,
                    service_name VARCHAR(255),
                    category VARCHAR(100),
                    department VARCHAR(100),
                    base_price NUMERIC(10,2) DEFAULT 0,
                    govt_rate NUMERIC(10,2),
                    private_rate NUMERIC(10,2),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    hospital_id INTEGER
                )
            `
        }
    ];

    let created = 0;
    let existed = 0;
    let errors = 0;

    for (const table of tables) {
        try {
            // Check if table already exists
            const check = await primaryPool.query(
                `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
                [table.name]
            );

            if (check.rows.length > 0) {
                console.log(`   ⏭️  Table '${table.name}' already exists — skipping`);
                existed++;
            } else {
                await primaryPool.query(table.ddl);
                console.log(`   ✅ Table '${table.name}' created successfully`);
                created++;
            }
        } catch (err) {
            console.error(`   ❌ Failed to create '${table.name}': ${err.message}`);
            errors++;
        }
    }

    console.log(`\n   📊 Tables: ${created} created, ${existed} already existed, ${errors} errors`);
    return { created, existed, errors };
}

// ─── COLUMN ADDITIONS ──────────────────────────────────────

async function addMissingColumns() {
    console.log('\n🔨 STEP 2: Adding missing columns...\n');

    const columns = [
        {
            table: 'lab_reference_ranges',
            column: 'test_name',
            type: 'VARCHAR(255)',
            ddl: `ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS test_name VARCHAR(255)`
        },
        {
            table: 'lab_requests',
            column: 'completed_by',
            type: 'INTEGER',
            ddl: `ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS completed_by INTEGER`
        },
        {
            table: 'blood_bank_pricing',
            column: 'private_processing_fee',
            type: 'NUMERIC(10,2) DEFAULT 0',
            ddl: `ALTER TABLE blood_bank_pricing ADD COLUMN IF NOT EXISTS private_processing_fee NUMERIC(10,2) DEFAULT 0`
        },
        {
            table: 'pmjay_claims',
            column: 'external_claim_id',
            type: 'VARCHAR(100)',
            ddl: `ALTER TABLE pmjay_claims ADD COLUMN IF NOT EXISTS external_claim_id VARCHAR(100)`
        },
        {
            table: 'dental_lab_orders',
            column: 'ordered_by',
            type: 'INTEGER',
            ddl: `ALTER TABLE dental_lab_orders ADD COLUMN IF NOT EXISTS ordered_by INTEGER`
        },
        {
            table: 'ophthalmology_inventory',
            column: 'stock_qty',
            type: 'INTEGER DEFAULT 0',
            ddl: `ALTER TABLE ophthalmology_inventory ADD COLUMN IF NOT EXISTS stock_qty INTEGER DEFAULT 0`
        },
        {
            table: 'orthopedic_inventory',
            column: 'stock_qty',
            type: 'INTEGER DEFAULT 0',
            ddl: `ALTER TABLE orthopedic_inventory ADD COLUMN IF NOT EXISTS stock_qty INTEGER DEFAULT 0`
        }
    ];

    let added = 0;
    let existed = 0;
    let skipped = 0;
    let errors = 0;

    for (const col of columns) {
        try {
            // Check if table exists first
            const tableCheck = await primaryPool.query(
                `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
                [col.table]
            );

            if (tableCheck.rows.length === 0) {
                console.log(`   ⚠️  Table '${col.table}' does not exist — skipping column '${col.column}'`);
                skipped++;
                continue;
            }

            // Check if column already exists
            const colCheck = await primaryPool.query(
                `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'`,
                [col.table, col.column]
            );

            if (colCheck.rows.length > 0) {
                console.log(`   ⏭️  Column '${col.table}.${col.column}' already exists — skipping`);
                existed++;
            } else {
                await primaryPool.query(col.ddl);
                console.log(`   ✅ Column '${col.table}.${col.column}' (${col.type}) added`);
                added++;
            }
        } catch (err) {
            console.error(`   ❌ Failed for '${col.table}.${col.column}': ${err.message}`);
            errors++;
        }
    }

    console.log(`\n   📊 Columns: ${added} added, ${existed} already existed, ${skipped} tables missing, ${errors} errors`);
    return { added, existed, skipped, errors };
}

// ─── CODE PATCHES ──────────────────────────────────────────

function patchCodeBugs() {
    console.log('\n🔨 STEP 3: Patching production code bugs...\n');

    let patches = {};

    // ── Patch 1: dentalController.js — missing `lot_number` destructuring ──
    try {
        const dentalPath = path.join(__dirname, '..', '..', 'controllers', 'dentalController.js');
        
        if (!fs.existsSync(dentalPath)) {
            console.log(`   ⚠️  dentalController.js not found at ${dentalPath}`);
            patches.dental = 'skipped (file not found)';
        } else {
            let content = fs.readFileSync(dentalPath, 'utf8');

            // Check if already patched
            if (content.includes("lot_number") && content.includes("low_number") && 
                content.includes("const { category, low_number, lot_number }")) {
                console.log('   ⏭️  dentalController.js already patched — skipping');
                patches.dental = 'already patched';
            } else {
                // Fix: add 'lot_number' to the destructuring on the getInventory line
                const oldLine = "const { category, low_number } = req.query;";
                const newLine = "const { category, low_number, lot_number } = req.query;";

                if (content.includes(oldLine)) {
                    content = content.replace(oldLine, newLine);
                    fs.writeFileSync(dentalPath, content, 'utf8');
                    console.log('   ✅ dentalController.js: Added missing `lot_number` to query destructuring');
                    patches.dental = 'patched';
                } else {
                    console.log('   ⚠️  Could not find exact line to patch in dentalController.js');
                    patches.dental = 'skipped (pattern not found)';
                }
            }
        }
    } catch (err) {
        console.error(`   ❌ Failed to patch dentalController.js: ${err.message}`);
        patches.dental = `error: ${err.message}`;
    }

    // ── Patch 2: insuranceService.js — EXTRACT type casting error ──
    try {
        const insurancePath = path.join(__dirname, '..', '..', 'services', 'insuranceService.js');

        if (!fs.existsSync(insurancePath)) {
            console.log(`   ⚠️  insuranceService.js not found at ${insurancePath}`);
            patches.insurance = 'skipped (file not found)';
        } else {
            let content = fs.readFileSync(insurancePath, 'utf8');

            // Check if already patched
            if (content.includes("AVG(settlement_date - submitted_at::date)") &&
                !content.includes("EXTRACT(DAY FROM (settlement_date")) {
                console.log('   ⏭️  insuranceService.js already patched — skipping');
                patches.insurance = 'already patched';
            } else {
                const oldExpr = "COALESCE(AVG(EXTRACT(DAY FROM (settlement_date - submitted_at::date))), 0) as avg_settlement_days";
                const newExpr = "COALESCE(AVG(settlement_date - submitted_at::date), 0) as avg_settlement_days";

                if (content.includes(oldExpr)) {
                    content = content.replace(oldExpr, newExpr);
                    fs.writeFileSync(insurancePath, content, 'utf8');
                    console.log('   ✅ insuranceService.js: Replaced EXTRACT(DAY FROM ...) with direct date subtraction');
                    patches.insurance = 'patched';
                } else if (content.includes("EXTRACT(DAY FROM (settlement_date")) {
                    // Broader match for similar variants
                    const extractRegex = /COALESCE\(AVG\(EXTRACT\(DAY FROM\s*\(settlement_date\s*-\s*submitted_at::date\)\)\),\s*0\)\s+as\s+avg_settlement_days/g;
                    const newText = "COALESCE(AVG(settlement_date - submitted_at::date), 0) as avg_settlement_days";
                    
                    const newContent = content.replace(extractRegex, newText);
                    if (newContent !== content) {
                        fs.writeFileSync(insurancePath, newContent, 'utf8');
                        console.log('   ✅ insuranceService.js: Fixed EXTRACT type cast (regex match)');
                        patches.insurance = 'patched (regex)';
                    } else {
                        console.log('   ⚠️  Could not find EXTRACT pattern in insuranceService.js');
                        patches.insurance = 'skipped (pattern not found)';
                    }
                } else {
                    console.log('   ⚠️  EXTRACT expression not found in insuranceService.js — may already be fixed');
                    patches.insurance = 'skipped (expression not found)';
                }
            }
        }
    } catch (err) {
        console.error(`   ❌ Failed to patch insuranceService.js: ${err.message}`);
        patches.insurance = `error: ${err.message}`;
    }

    console.log(`\n   📊 Code patches: ${JSON.stringify(patches)}`);
    return patches;
}

// ─── VERIFICATION ──────────────────────────────────────────

async function verifyAll() {
    console.log('\n🔨 STEP 4: Final verification...\n');

    // Verify tables exist
    const tableNames = [
        'instrument_comm_log', 'price_change_requests', 'emergency_events',
        'cssd_batches', 'rehab_sessions', 'services'
    ];
    let tablesOk = 0, tablesFail = 0;

    for (const t of tableNames) {
        const r = await primaryPool.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
            [t]
        );
        if (r.rows.length > 0) { console.log(`   ✅ Table '${t}' — OK`); tablesOk++; }
        else { console.error(`   ❌ Table '${t}' — MISSING!`); tablesFail++; }
    }

    // Verify columns exist (only for tables known to exist)
    const columnChecks = [
        ['lab_reference_ranges', 'test_name'],
        ['lab_requests', 'completed_by'],
        ['blood_bank_pricing', 'private_processing_fee'],
        ['pmjay_claims', 'external_claim_id'],
        ['dental_lab_orders', 'ordered_by'],
        ['ophthalmology_inventory', 'stock_qty'],
        ['orthopedic_inventory', 'stock_qty']
    ];
    let colsOk = 0, colsSkipped = 0, colsFail = 0;

    for (const [table, col] of columnChecks) {
        const exists = await primaryPool.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
            [table]
        );
        if (exists.rows.length === 0) {
            console.log(`   ⚠️  Table '${table}' not found — column '${col}' skipped`);
            colsSkipped++;
            continue;
        }
        const r = await primaryPool.query(
            `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'`,
            [table, col]
        );
        if (r.rows.length > 0) { console.log(`   ✅ Column '${table}.${col}' — OK`); colsOk++; }
        else { console.error(`   ❌ Column '${table}.${col}' — MISSING!`); colsFail++; }
    }

    // Verify code patches
    console.log('\n   📝 Code patch verification:');
    try {
        const dentalContent = fs.readFileSync(
            path.join(__dirname, '..', '..', 'controllers', 'dentalController.js'), 'utf8'
        );
        if (dentalContent.includes("const { category, low_number, lot_number } = req.query;")) {
            console.log('   ✅ dentalController.js — lot_number properly destructured');
        } else {
            console.log('   ⚠️  dentalController.js — lot_number destructuring not confirmed');
        }
    } catch (e) {
        console.log(`   ❌ dentalController.js verification error: ${e.message}`);
    }

    try {
        const insContent = fs.readFileSync(
            path.join(__dirname, '..', '..', 'services', 'insuranceService.js'), 'utf8'
        );
        if (insContent.includes("EXTRACT(DAY FROM (settlement_date")) {
            console.log('   ❌ insuranceService.js — EXTRACT expression still present!');
        } else {
            console.log('   ✅ insuranceService.js — EXTRACT expression removed');
        }
    } catch (e) {
        console.log(`   ❌ insuranceService.js verification error: ${e.message}`);
    }

    console.log(`\n========================================================`);
    console.log(`🏁 FINAL SUMMARY`);
    console.log(`   Tables:  ${tablesOk} OK, ${tablesFail} missing`);
    console.log(`   Columns: ${colsOk} OK, ${colsSkipped} tables missing, ${colsFail} missing columns`);
    console.log(`========================================================`);
}

// ─── MAIN ──────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  Wolf HMS — Crawler Schema Gap Remediation             ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    try {
        // Step 1: Create missing tables
        const tableResult = await createMissingTables();

        // Step 2: Add missing columns
        const columnResult = await addMissingColumns();

        // Step 3: Patch code bugs
        const patchResult = patchCodeBugs();

        // Step 4: Final verification
        await verifyAll();

        console.log('\n✅ Migration script completed successfully.\n');

        // Exit cleanly
        await primaryPool.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Fatal error during migration:', err.message);
        console.error(err.stack);
        try { await primaryPool.end(); } catch (_) {}
        process.exit(1);
    }
}

main();