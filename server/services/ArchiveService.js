/**
 * Archive Service
 * [PHASE 4] Hyper-Scale Infrastructure - Cold Storage
 * 
 * Moves old records to archive tables and optionally Cloud Storage.
 * Keeps active database small and fast.
 */

const { pool } = require('../db');

class ArchiveService {
    
    // Default archive threshold (2 years)
    static DEFAULT_ARCHIVE_DAYS = 730;
    
    // Tables eligible for archiving
    static ARCHIVABLE_TABLES = [
        { 
            name: 'lab_requests', 
            dateColumn: 'requested_at',
            archiveTable: 'lab_requests_archive',
            dependencies: [{ table: 'lab_results', fk: 'request_id' }]
        },
        { 
            name: 'opd_visits', 
            dateColumn: 'visit_date',
            archiveTable: 'opd_visits_archive',
            dependencies: []
        },
        { 
            name: 'audit_logs', 
            dateColumn: 'created_at',
            archiveTable: 'audit_logs_archive',
            dependencies: []
        },
        { 
            name: 'vitals_logs', 
            dateColumn: 'recorded_at',
            archiveTable: 'vitals_logs_archive',
            dependencies: []
        },
        { 
            name: 'care_tasks', 
            dateColumn: 'created_at',
            archiveTable: 'care_tasks_archive',
            dependencies: []
        }
    ];

    /**
     * Ensure archive tables exist (mirror structure of originals)
     */
    static async ensureArchiveTables() {
        const results = [];
        
        for (const config of this.ARCHIVABLE_TABLES) {
            try {
                // Check if archive table exists
                const exists = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [config.archiveTable]);
                
                if (!exists.rows[0].exists) {
                    // Create archive table with same structure + archived_at column
                    await pool.query(`
                        CREATE TABLE ${config.archiveTable} AS 
                        SELECT *, NOW() as archived_at 
                        FROM ${config.name} 
                        WHERE 1=0
                    `);
                    
                    // Add index on original ID for lookups
                    await pool.query(`
                        CREATE INDEX idx_${config.archiveTable}_original_id 
                        ON ${config.archiveTable}(id)
                    `);
                    
                    results.push({ table: config.archiveTable, status: 'created' });
                } else {
                    results.push({ table: config.archiveTable, status: 'exists' });
                }
            } catch (err) {
                results.push({ table: config.archiveTable, status: 'error', error: err.message });
            }
        }
        
        return results;
    }

    /**
     * Archive old records for a specific table
     * @param {string} tableName - Source table name
     * @param {number} hospitalId - Hospital ID (null for all)
     * @param {number} daysOld - Archive records older than X days
     * @returns {Object} Archive statistics
     */
    static async archiveTable(tableName, hospitalId = null, daysOld = this.DEFAULT_ARCHIVE_DAYS) {
        const config = this.ARCHIVABLE_TABLES.find(t => t.name === tableName);
        if (!config) {
            throw new Error(`Table ${tableName} is not configured for archiving`);
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let whereClause = `${config.dateColumn} < $1`;
        const params = [cutoffDate];
        
        if (hospitalId) {
            whereClause += ` AND hospital_id = $2`;
            params.push(hospitalId);
        }

        try {
            // Start transaction
            await pool.query('BEGIN');

            // 1. Count records to archive
            const countRes = await pool.query(
                `SELECT COUNT(*) as count FROM ${config.name} WHERE ${whereClause}`,
                params
            );
            const recordCount = parseInt(countRes.rows[0].count);

            if (recordCount === 0) {
                await pool.query('ROLLBACK');
                return { table: tableName, archived: 0, message: 'No records to archive' };
            }

            // 2. Archive dependencies first
            for (const dep of config.dependencies) {
                await pool.query(`
                    INSERT INTO ${dep.table}_archive 
                    SELECT d.*, NOW() as archived_at 
                    FROM ${dep.table} d
                    JOIN ${config.name} p ON d.${dep.fk} = p.id
                    WHERE p.${whereClause}
                `, params);

                await pool.query(`
                    DELETE FROM ${dep.table} 
                    WHERE ${dep.fk} IN (
                        SELECT id FROM ${config.name} WHERE ${whereClause}
                    )
                `, params);
            }

            // 3. Copy to archive table
            await pool.query(`
                INSERT INTO ${config.archiveTable} 
                SELECT *, NOW() as archived_at 
                FROM ${config.name} 
                WHERE ${whereClause}
            `, params);

            // 4. Delete from main table
            const deleteRes = await pool.query(
                `DELETE FROM ${config.name} WHERE ${whereClause}`,
                params
            );

            // 5. Commit transaction
            await pool.query('COMMIT');

            // 6. Log archive operation
            await this.logArchiveOperation(tableName, recordCount, hospitalId);

            return {
                table: tableName,
                archived: recordCount,
                cutoffDate: cutoffDate.toISOString().split('T')[0],
                archiveTable: config.archiveTable
            };

        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }
    }

    /**
     * Archive all eligible tables
     */
    static async archiveAll(hospitalId = null, daysOld = this.DEFAULT_ARCHIVE_DAYS) {
        const results = [];
        
        // Ensure archive tables exist
        await this.ensureArchiveTables();

        for (const config of this.ARCHIVABLE_TABLES) {
            try {
                const result = await this.archiveTable(config.name, hospitalId, daysOld);
                results.push(result);
            } catch (err) {
                results.push({ table: config.name, error: err.message });
            }
        }

        return {
            timestamp: new Date().toISOString(),
            hospitalId,
            daysOld,
            results
        };
    }

    /**
     * Get archive statistics
     */
    static async getArchiveStats(hospitalId = null) {
        const stats = [];
        
        for (const config of this.ARCHIVABLE_TABLES) {
            try {
                const mainParams = hospitalId ? [hospitalId] : [];
                const mainWhere = hospitalId ? 'WHERE hospital_id = $1' : '';
                
                const mainCount = await pool.query(
                    `SELECT COUNT(*) as count FROM ${config.name} ${mainWhere}`,
                    mainParams
                );

                // Check if archive table exists
                const archiveExists = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [config.archiveTable]);

                let archiveCount = { rows: [{ count: 0 }] };
                if (archiveExists.rows[0].exists) {
                    archiveCount = await pool.query(
                        `SELECT COUNT(*) as count FROM ${config.archiveTable} ${mainWhere}`,
                        mainParams
                    );
                }

                stats.push({
                    table: config.name,
                    activeRecords: parseInt(mainCount.rows[0].count),
                    archivedRecords: parseInt(archiveCount.rows[0].count),
                    archiveTable: config.archiveTable
                });
            } catch (err) {
                stats.push({ table: config.name, error: err.message });
            }
        }

        return stats;
    }

    /**
     * Log archive operation
     */
    static async logArchiveOperation(tableName, recordCount, hospitalId) {
        try {
            await pool.query(`
                INSERT INTO archive_logs (table_name, record_count, hospital_id, archived_at)
                VALUES ($1, $2, $3, NOW())
            `, [tableName, recordCount, hospitalId]);
        } catch (err) {
            // Log table might not exist yet, that's OK
            console.warn('[ArchiveService] Could not log archive operation:', err.message);
        }
    }

    /**
     * Restore records from archive (for auditing/legal needs)
     */
    static async restoreFromArchive(tableName, recordIds, hospitalId) {
        const config = this.ARCHIVABLE_TABLES.find(t => t.name === tableName);
        if (!config) {
            throw new Error(`Table ${tableName} is not configured for archiving`);
        }

        try {
            await pool.query('BEGIN');

            // Move back from archive to main table
            const restored = await pool.query(`
                WITH moved AS (
                    DELETE FROM ${config.archiveTable}
                    WHERE id = ANY($1) AND hospital_id = $2
                    RETURNING *
                )
                INSERT INTO ${config.name} 
                SELECT * FROM moved
                RETURNING id
            `, [recordIds, hospitalId]);

            await pool.query('COMMIT');

            return {
                table: tableName,
                restored: restored.rowCount,
                ids: restored.rows.map(r => r.id)
            };

        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }
    }
}

module.exports = ArchiveService;
