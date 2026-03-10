/**
 * Migration Runner
 * Automated database migration execution
 * Phase 4: DevOps & CI/CD (Gold Standard HMS)
 */

const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Get list of migration files sorted by number
 */
const getMigrationFiles = () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort((a, b) => {
            const numA = parseInt(a.split('_')[0]) || 0;
            const numB = parseInt(b.split('_')[0]) || 0;
            return numA - numB;
        });
    return files;
};

/**
 * Create migrations tracking table if not exists
 */
const ensureMigrationsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ DEFAULT NOW(),
            checksum VARCHAR(64)
        )
    `);
};

/**
 * Get list of already applied migrations
 */
const getAppliedMigrations = async () => {
    const result = await pool.query('SELECT filename FROM schema_migrations');
    return new Set(result.rows.map(r => r.filename));
};

/**
 * Calculate checksum for migration file
 */
const getChecksum = (content) => {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
};

/**
 * Run a single migration file
 */
const runMigration = async (filename) => {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const checksum = getChecksum(content);
    
    console.log(`📦 Running migration: ${filename}`);
    
    try {
        await pool.query('BEGIN');
        await pool.query(content);
        await pool.query(
            'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
            [filename, checksum]
        );
        await pool.query('COMMIT');
        console.log(`✅ Migration complete: ${filename}`);
        return true;
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ Migration failed: ${filename}`);
        console.error(error.message);
        return false;
    }
};

/**
 * Run all pending migrations
 */
const runMigrations = async () => {
    console.log('🚀 Migration Runner Started');
    console.log('===========================');
    
    try {
        await ensureMigrationsTable();
        
        const allMigrations = getMigrationFiles();
        const appliedMigrations = await getAppliedMigrations();
        
        const pendingMigrations = allMigrations.filter(f => !appliedMigrations.has(f));
        
        if (pendingMigrations.length === 0) {
            console.log('✅ No pending migrations');
            return { success: true, applied: 0 };
        }
        
        console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
        
        let applied = 0;
        for (const migration of pendingMigrations) {
            const success = await runMigration(migration);
            if (!success) {
                return { success: false, applied, failed: migration };
            }
            applied++;
        }
        
        console.log('===========================');
        console.log(`✅ All migrations complete (${applied} applied)`);
        return { success: true, applied };
        
    } catch (error) {
        console.error('💥 Migration runner error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Get migration status
 */
const getMigrationStatus = async () => {
    try {
        await ensureMigrationsTable();
        
        const allMigrations = getMigrationFiles();
        const appliedResult = await pool.query(
            'SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at'
        );
        const appliedMigrations = new Map(
            appliedResult.rows.map(r => [r.filename, r.applied_at])
        );
        
        return allMigrations.map(f => ({
            filename: f,
            applied: appliedMigrations.has(f),
            applied_at: appliedMigrations.get(f) || null
        }));
    } catch (error) {
        console.error('Status check error:', error.message);
        return [];
    }
};

// CLI execution
if (require.main === module) {
    runMigrations().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = {
    runMigrations,
    getMigrationStatus,
    runMigration
};
