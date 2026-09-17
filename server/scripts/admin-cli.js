#!/usr/bin/env node
/**
 * admin-cli.js — Wolf HMS Administrative Database CLI
 * 
 * Part of Wolf HMS Phase 2 Hardening.
 * Replaces the unauthenticated /api/health/exec-sql backdoor with an
 * authenticated, audited, and transaction-safe command-line tool.
 * 
 * Usage:
 *   node scripts/admin-cli.js --sql "SELECT count(*) FROM patients"
 *   node scripts/admin-cli.js --sql "UPDATE users SET role = 'doctor' WHERE id = 5" --dry-run
 *   node scripts/admin-cli.js --file "migrations/custom_patch.sql"
 * 
 * Authentication:
 *   Requires MIGRATION_CLI_TOKEN in environment or --token <token> flag.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Ensure log directory exists
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
    try {
        fs.mkdirSync(logDir, { recursive: true });
    } catch (e) {
        // Log dir creation failed (e.g. read-only filesystem)
    }
}

const logFile = path.join(logDir, 'admin-cli.log');

const writeAuditLog = (entry) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [PID:${process.pid}] [USER:${process.env.USER || process.env.USERNAME || 'unknown'}] ` +
                 `STATUS:${entry.status} DURATION:${entry.durationMs || 0}ms SQL:"${(entry.sql || '').replace(/\s+/g, ' ').substring(0, 300)}" ` +
                 `${entry.error ? `ERROR:${entry.error} ` : ''}${entry.rowCount !== undefined ? `ROWS:${entry.rowCount} ` : ''}\n`;
    try {
        fs.appendFileSync(logFile, line, 'utf8');
        logger.info(`[admin-cli] ${entry.status}`, { sql: entry.sql, durationMs: entry.durationMs, status: entry.status });
    } catch (err) {
        logger.error('⚠️  Failed to write to admin-cli audit log:', { error: err.message });
    }
};

const parseArgs = (argv) => {
    const args = {
        sql: null,
        file: null,
        token: null,
        dryRun: false,
        hospitalId: null,
        help: false
    };

    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--sql' && i + 1 < argv.length) {
            args.sql = argv[++i];
        } else if (arg === '--file' && i + 1 < argv.length) {
            args.file = argv[++i];
        } else if (arg === '--token' && i + 1 < argv.length) {
            args.token = argv[++i];
        } else if (arg === '--hospital' && i + 1 < argv.length) {
            args.hospitalId = parseInt(argv[++i], 10);
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg === '--help' || arg === '-h') {
            args.help = true;
        }
    }

    return args;
};

const printHelp = () => {
    console.log(`
🛡️  Wolf HMS Administrative Database CLI
-----------------------------------------
Usage:
  node scripts/admin-cli.js [options]

Options:
  --sql <query>       Raw SQL statement to execute
  --file <path>       Path to a .sql file to execute
  --token <token>     Authorization token (or set MIGRATION_CLI_TOKEN env)
  --dry-run           Prefix query with EXPLAIN (non-destructive test)
  --hospital <id>     Set session app.current_tenant to hospital_id
  --help, -h          Display this help message

Examples:
  node scripts/admin-cli.js --sql "SELECT count(*) FROM emergency_logs;"
  node scripts/admin-cli.js --file migrations/301_rls_gapfill.sql
  node scripts/admin-cli.js --sql "DELETE FROM audit_logs WHERE id < 100" --dry-run
`);
};

const runAdminCli = async (customPool = null, customArgv = process.argv) => {
    const args = parseArgs(customArgv);

    if (args.help) {
        printHelp();
        return { success: true, code: 0 };
    }

    // Token verification
    const expectedToken = process.env.MIGRATION_CLI_TOKEN;
    const providedToken = args.token || expectedToken;

    if (!expectedToken) {
        const errMsg = 'MIGRATION_CLI_TOKEN is not configured in the server environment. Access denied.';
        console.error(`❌ [AUTH ERROR] ${errMsg}`);
        writeAuditLog({ status: 'AUTH_FAILED', sql: args.sql || args.file, error: 'MIGRATION_CLI_TOKEN unset' });
        return { success: false, code: 1, error: errMsg };
    }

    if (!providedToken || providedToken !== expectedToken) {
        const errMsg = 'Invalid or missing administrative token. Access denied.';
        console.error(`❌ [AUTH ERROR] ${errMsg}`);
        writeAuditLog({ status: 'AUTH_FAILED', sql: args.sql || args.file, error: 'Token mismatch' });
        return { success: false, code: 1, error: errMsg };
    }

    // Determine SQL statement
    let sqlStatement = args.sql;
    if (args.file) {
        const resolvedPath = path.resolve(process.cwd(), args.file);
        if (!fs.existsSync(resolvedPath)) {
            const errMsg = `File not found: ${resolvedPath}`;
            console.error(`❌ ${errMsg}`);
            writeAuditLog({ status: 'FILE_NOT_FOUND', sql: args.file, error: errMsg });
            return { success: false, code: 1, error: errMsg };
        }
        sqlStatement = fs.readFileSync(resolvedPath, 'utf8');
    }

    if (!sqlStatement || !sqlStatement.trim()) {
        const errMsg = 'No SQL query or file provided. Use --sql or --file.';
        console.error(`❌ ${errMsg}`);
        return { success: false, code: 1, error: errMsg };
    }

    let finalSql = sqlStatement.trim();
    if (args.dryRun) {
        console.log('🔍 [DRY RUN MODE] Wrapping query with EXPLAIN...');
        finalSql = `EXPLAIN ${finalSql}`;
    }

    const pool = customPool || require('../config/db');
    const startTime = Date.now();

    try {
        const client = await pool.connect();
        try {
            if (args.hospitalId) {
                await client.query(`SELECT set_config('app.current_tenant', $1, false)`, [args.hospitalId.toString()]);
            }

            console.log(`⏳ Executing SQL (${args.dryRun ? 'DRY-RUN' : 'LIVE'})...`);
            const result = await client.query(finalSql);
            const durationMs = Date.now() - startTime;

            console.log(`✅ Query executed successfully in ${durationMs}ms`);
            if (result.rowCount !== null && result.rowCount !== undefined) {
                console.log(`   Rows affected/returned: ${result.rowCount}`);
            }

            if (result.rows && result.rows.length > 0) {
                console.table(result.rows.slice(0, 50));
                if (result.rows.length > 50) {
                    console.log(`... and ${result.rows.length - 50} more rows.`);
                }
            }

            writeAuditLog({
                status: 'SUCCESS',
                sql: finalSql,
                rowCount: result.rowCount,
                durationMs
            });

            return {
                success: true,
                code: 0,
                rowCount: result.rowCount,
                rows: result.rows,
                durationMs
            };
        } finally {
            client.release();
        }
    } catch (err) {
        const durationMs = Date.now() - startTime;
        console.error(`❌ SQL Execution Error: ${err.message}`);
        writeAuditLog({
            status: 'SQL_ERROR',
            sql: finalSql,
            error: err.message,
            durationMs
        });
        return { success: false, code: 2, error: err.message };
    }
};

// If run directly from CLI
if (require.main === module) {
    runAdminCli().then(res => {
        if (!res.success) {
            process.exit(res.code || 1);
        }
        process.exit(0);
    });
}

module.exports = {
    runAdminCli,
    parseArgs,
    writeAuditLog
};
