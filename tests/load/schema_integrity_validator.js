/**
 * Wolf HMS — Schema Integrity Validator
 * ======================================
 * Principal DBA Audit Script
 * 
 * Connects directly to PostgreSQL via server/db.js pool and inspects
 * information_schema to detect:
 *   1. Foreign key type mismatches (patient_id, user_id vs parent PK type)
 *   2. Missing columns on audit tables
 *   3. Missing expected tables
 *   4. Orphaned indexes and constraint violations
 *
 * Usage:
 *   node tests/load/schema_integrity_validator.js
 */

const { pool } = require('../../server/db');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION — Expected schema contracts
// ═══════════════════════════════════════════════════════════════════

const PARENT_PK_TABLES = ['patients', 'users'];

const FK_COLUMN_MAPPINGS = {
  patient_id: 'patients',
  user_id:    'users',
  actor_id:   'users',
  linked_by:  'users',
  revoked_by: 'users',
  collected_by: 'users',
  doctor_id:  'users',
  nurse_id:   'users',
  created_by: 'users',
  updated_by: 'users',
  assigned_to: 'users',
  discharged_by: 'users',
  admitted_by: 'users',
};

const AUDIT_TABLES = {
  login_audit_log: {
    required_columns: {
      id:             ['bigint'],
      user_id:        ['integer'],
      username:       ['character varying'],
      action:         ['character varying'],
      ip_address:     ['character varying'],
      user_agent:     ['text'],
      success:        ['boolean'],
      failure_reason: ['text'],
      details:        ['jsonb'],
      hospital_id:    ['integer'],
      created_at:     ['timestamp with time zone'],
    }
  },
  abdm_audit_log: {
    required_columns: {
      id:              ['bigint'],
      event_type:      ['character varying'],
      patient_id:      null,  // type-checked dynamically against patients.id
      abha_number:     ['character varying'],
      actor_id:        ['integer'],
      details_json:    ['jsonb'],
      hospital_id:     ['integer'],
      created_at:      ['timestamp with time zone'],
    }
  },
};

const CRITICAL_TABLES = [
  'patients',
  'users',
  'admissions',
  'appointments',
  'hospitals',
  'beds',
  'wards',
  'opd_visits',
  'billing_kpis',
  'invoice_items',
  'inventory_items',
  'govt_scheme_beneficiaries',
  'login_audit_log',
  'abdm_audit_log',
  'consent_artifacts',
  'patient_abha_mapping',
  'care_contexts',
  'refresh_tokens',
  'hospital_settings',
];

const USER_SECURITY_COLUMNS = {
  failed_login_count: ['integer'],
  locked_until:       ['timestamp with time zone'],
  last_failed_ip:     ['character varying'],
  last_login_at:      ['timestamp with time zone'],
  last_login_ip:      ['character varying'],
};

// ═══════════════════════════════════════════════════════════════════
// REPORT STATE
// ═══════════════════════════════════════════════════════════════════
const report = {
  passed: 0,
  warnings: 0,
  critical: 0,
  entries: [],
};

function pass(category, message) {
  report.passed++;
  report.entries.push({ severity: 'PASS', category, message });
}

function warn(category, message) {
  report.warnings++;
  report.entries.push({ severity: 'WARN', category, message });
}

function critical(category, message) {
  report.critical++;
  report.entries.push({ severity: 'CRIT', category, message });
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT PHASE 1: Resolve Parent PK Types
// ═══════════════════════════════════════════════════════════════════
async function resolveParentTypes() {
  const parentTypes = {};

  for (const table of PARENT_PK_TABLES) {
    const res = await pool.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = 'id'
    `, [table]);

    if (res.rows.length === 0) {
      critical('PARENT_PK', `Table "${table}" not found or has no "id" column`);
    } else {
      parentTypes[table] = res.rows[0].data_type;
      pass('PARENT_PK', `${table}.id → ${res.rows[0].data_type} (${res.rows[0].udt_name})`);
    }
  }

  return parentTypes;
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT PHASE 2: FK Type Mismatch Detection
// ═══════════════════════════════════════════════════════════════════
async function auditForeignKeyTypes(parentTypes) {
  // Find ALL columns across ALL tables that match our FK column names
  const fkColumns = Object.keys(FK_COLUMN_MAPPINGS);
  const placeholders = fkColumns.map((_, i) => `$${i + 1}`).join(', ');

  const res = await pool.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN (${placeholders})
    ORDER BY table_name, column_name
  `, fkColumns);

  let mismatches = 0;

  for (const row of res.rows) {
    const parentTable = FK_COLUMN_MAPPINGS[row.column_name];
    if (!parentTable || !parentTypes[parentTable]) continue;

    const expectedType = parentTypes[parentTable];
    const actualType = row.data_type;

    if (actualType !== expectedType) {
      critical('FK_TYPE_MISMATCH',
        `${row.table_name}.${row.column_name} is "${actualType}" but ${parentTable}.id is "${expectedType}"`
      );
      mismatches++;
    } else {
      pass('FK_TYPE_MATCH',
        `${row.table_name}.${row.column_name} → ${actualType} ✓ (matches ${parentTable}.id)`
      );
    }
  }

  if (mismatches === 0) {
    pass('FK_TYPE_SUMMARY', `All ${res.rows.length} FK columns match parent PK types`);
  } else {
    critical('FK_TYPE_SUMMARY', `${mismatches} / ${res.rows.length} FK columns have TYPE MISMATCHES`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT PHASE 3: Critical Table Existence
// ═══════════════════════════════════════════════════════════════════
async function auditCriticalTables() {
  const res = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `);

  const existingTables = new Set(res.rows.map(r => r.table_name));

  for (const table of CRITICAL_TABLES) {
    if (existingTables.has(table)) {
      pass('TABLE_EXISTS', `Table "${table}" exists`);
    } else {
      critical('TABLE_MISSING', `Table "${table}" is MISSING from database`);
    }
  }

  pass('TABLE_COUNT', `Total tables in public schema: ${existingTables.size}`);
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT PHASE 4: Audit Table Column Verification
// ═══════════════════════════════════════════════════════════════════
async function auditAuditTables(parentTypes) {
  for (const [tableName, spec] of Object.entries(AUDIT_TABLES)) {
    // Check table exists first
    const tableCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);

    if (tableCheck.rows.length === 0) {
      critical('AUDIT_TABLE', `Audit table "${tableName}" does not exist`);
      continue;
    }

    // Get all columns for this table
    const colRes = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const existingCols = {};
    for (const col of colRes.rows) {
      existingCols[col.column_name] = col;
    }

    for (const [colName, expectedTypes] of Object.entries(spec.required_columns)) {
      if (!existingCols[colName]) {
        critical('AUDIT_COLUMN_MISSING', `${tableName}.${colName} is MISSING`);
        continue;
      }

      const actual = existingCols[colName];

      // Dynamic type check for patient_id / user_id
      if (expectedTypes === null) {
        const parentTable = FK_COLUMN_MAPPINGS[colName];
        if (parentTable && parentTypes[parentTable]) {
          if (actual.data_type !== parentTypes[parentTable]) {
            critical('AUDIT_COLUMN_TYPE',
              `${tableName}.${colName} is "${actual.data_type}" but should match ${parentTable}.id → "${parentTypes[parentTable]}"`
            );
          } else {
            pass('AUDIT_COLUMN', `${tableName}.${colName} → ${actual.data_type} ✓`);
          }
        }
        continue;
      }

      if (!expectedTypes.includes(actual.data_type)) {
        warn('AUDIT_COLUMN_TYPE',
          `${tableName}.${colName} is "${actual.data_type}" — expected one of: [${expectedTypes.join(', ')}]`
        );
      } else {
        pass('AUDIT_COLUMN', `${tableName}.${colName} → ${actual.data_type} ✓`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT PHASE 5: Users Security Columns
// ═══════════════════════════════════════════════════════════════════
async function auditUserSecurityColumns() {
  const colRes = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `);

  const existingCols = {};
  for (const col of colRes.rows) {
    existingCols[col.column_name] = col.data_type;
  }

  for (const [colName, expectedTypes] of Object.entries(USER_SECURITY_COLUMNS)) {
    if (!existingCols[colName]) {
      critical('USER_SECURITY', `users.${colName} is MISSING — login security will crash`);
      continue;
    }

    if (!expectedTypes.includes(existingCols[colName])) {
      warn('USER_SECURITY',
        `users.${colName} is "${existingCols[colName]}" — expected: [${expectedTypes.join(', ')}]`
      );
    } else {
      pass('USER_SECURITY', `users.${colName} → ${existingCols[colName]} ✓`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT PHASE 6: Duplicate/Orphaned Index Detection
// ═══════════════════════════════════════════════════════════════════
async function auditIndexes() {
  const res = await pool.query(`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  // Check for tables referenced in indexes that don't exist
  const tableCheck = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const existingTables = new Set(tableCheck.rows.map(r => r.table_name));

  let orphaned = 0;
  for (const idx of res.rows) {
    if (!existingTables.has(idx.tablename)) {
      warn('ORPHAN_INDEX', `Index "${idx.indexname}" references non-existent table "${idx.tablename}"`);
      orphaned++;
    }
  }

  if (orphaned === 0) {
    pass('INDEX_HEALTH', `All ${res.rows.length} indexes reference valid tables`);
  }

  // Detect duplicate indexes (same table + same column set)
  const indexMap = {};
  for (const idx of res.rows) {
    // Extract column list from CREATE INDEX definition
    const colMatch = idx.indexdef.match(/\(([^)]+)\)/);
    if (!colMatch) continue;
    const key = `${idx.tablename}::${colMatch[1].trim()}`;
    if (!indexMap[key]) {
      indexMap[key] = [];
    }
    indexMap[key].push(idx.indexname);
  }

  let duplicates = 0;
  for (const [key, names] of Object.entries(indexMap)) {
    if (names.length > 1) {
      warn('DUPLICATE_INDEX',
        `Potential duplicate indexes on ${key.split('::')[0]}(${key.split('::')[1]}): ${names.join(', ')}`
      );
      duplicates++;
    }
  }

  if (duplicates === 0) {
    pass('INDEX_DEDUP', 'No duplicate indexes detected');
  }
}

// ═══════════════════════════════════════════════════════════════════
// REPORT RENDERER
// ═══════════════════════════════════════════════════════════════════
function renderReport() {
  const width = 80;
  const line = '═'.repeat(width);
  const thinLine = '─'.repeat(width);

  console.log('\n' + line);
  console.log('  🔍 WOLF HMS — SCHEMA INTEGRITY REPORT');
  console.log('  Generated: ' + new Date().toISOString());
  console.log(line + '\n');

  // Group by severity
  const criticals = report.entries.filter(e => e.severity === 'CRIT');
  const warnings  = report.entries.filter(e => e.severity === 'WARN');
  const passes    = report.entries.filter(e => e.severity === 'PASS');

  if (criticals.length > 0) {
    console.log('  🚨 CRITICAL FINDINGS (' + criticals.length + ')');
    console.log(thinLine);
    for (const e of criticals) {
      console.log(`  ❌ [${e.category}] ${e.message}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('  ⚠️  WARNINGS (' + warnings.length + ')');
    console.log(thinLine);
    for (const e of warnings) {
      console.log(`  ⚠️  [${e.category}] ${e.message}`);
    }
    console.log('');
  }

  // Only show pass summary, not every individual pass
  console.log('  ✅ PASSED CHECKS (' + passes.length + ')');
  console.log(thinLine);

  // Group passes by category
  const passByCategory = {};
  for (const e of passes) {
    if (!passByCategory[e.category]) passByCategory[e.category] = [];
    passByCategory[e.category].push(e.message);
  }

  for (const [cat, msgs] of Object.entries(passByCategory)) {
    if (msgs.length <= 3) {
      for (const m of msgs) console.log(`  ✅ [${cat}] ${m}`);
    } else {
      console.log(`  ✅ [${cat}] ${msgs.length} checks passed`);
    }
  }

  console.log('\n' + line);
  console.log('  SUMMARY');
  console.log(thinLine);
  console.log(`  ✅ Passed:    ${report.passed}`);
  console.log(`  ⚠️  Warnings:  ${report.warnings}`);
  console.log(`  ❌ Critical:  ${report.critical}`);

  const health = report.critical === 0
    ? (report.warnings === 0 ? '🟢 HEALTHY' : '🟡 DEGRADED')
    : '🔴 CRITICAL — IMMEDIATE ACTION REQUIRED';

  console.log(`\n  Schema Health: ${health}`);
  console.log(line + '\n');

  return report.critical;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n🔍 Wolf HMS Schema Integrity Validator starting...\n');

  try {
    // Phase 1: Resolve parent PK types
    console.log('  Phase 1: Resolving parent primary key types...');
    const parentTypes = await resolveParentTypes();

    // Phase 2: FK type mismatch scan
    console.log('  Phase 2: Scanning foreign key type mismatches...');
    await auditForeignKeyTypes(parentTypes);

    // Phase 3: Critical table existence
    console.log('  Phase 3: Verifying critical table existence...');
    await auditCriticalTables();

    // Phase 4: Audit table column verification
    console.log('  Phase 4: Auditing audit table schemas...');
    await auditAuditTables(parentTypes);

    // Phase 5: User security columns
    console.log('  Phase 5: Checking user security columns...');
    await auditUserSecurityColumns();

    // Phase 6: Index health
    console.log('  Phase 6: Checking index health...');
    await auditIndexes();

    // Render final report
    const critCount = renderReport();
    process.exit(critCount > 0 ? 1 : 0);

  } catch (err) {
    console.error('\n❌ VALIDATOR CRASHED:', err.message);
    console.error(err.stack);
    process.exit(2);
  }
}

main();
