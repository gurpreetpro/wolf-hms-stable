/**
 * rlsMatrix.test.js — Unit Tests for RLS Migration Coverage and withTenantContext Helper
 */

const fs = require('fs');
const path = require('path');
const { withTenantContext } = require('../../middleware/rlsContext');

describe('Row-Level Security (RLS) Coverage & Context Helper (Phase 2)', () => {
    test('every table with hospital_id must have an RLS policy in migration 300 or 301', () => {
        const migrationsDir = path.resolve(__dirname, '..', '..', 'migrations');
        const addHospitalIdFile = path.join(migrationsDir, 'add_hospital_id_to_96_tables.sql');
        const sql300File = path.join(migrationsDir, '300_row_level_security.sql');
        const sql301File = path.join(migrationsDir, '301_rls_gapfill.sql');

        expect(fs.existsSync(addHospitalIdFile)).toBe(true);
        expect(fs.existsSync(sql300File)).toBe(true);
        expect(fs.existsSync(sql301File)).toBe(true);

        const addHospitalContent = fs.readFileSync(addHospitalIdFile, 'utf8');
        const sql300Content = fs.readFileSync(sql300File, 'utf8');
        const sql301Content = fs.readFileSync(sql301File, 'utf8');

        // Extract tables requiring hospital_id
        const tableRegex = /ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+hospital_id/gi;
        const requiredTables = new Set();
        let match;
        while ((match = tableRegex.exec(addHospitalContent)) !== null) {
            requiredTables.add(match[1].toLowerCase());
        }

        expect(requiredTables.size).toBeGreaterThanOrEqual(90);

        // Extract policies from 300 and 301
        const policyRegex = /CREATE\s+POLICY\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)/gi;
        const coveredTables = new Set();

        while ((match = policyRegex.exec(sql300Content)) !== null) {
            coveredTables.add(match[2].toLowerCase());
        }
        while ((match = policyRegex.exec(sql301Content)) !== null) {
            coveredTables.add(match[2].toLowerCase());
        }

        const missingTables = Array.from(requiredTables).filter(t => !coveredTables.has(t));
        expect(missingTables).toEqual([]);
    });

    test('withTenantContext sets app.current_tenant locally in transaction and commits', async () => {
        const mockQueries = [];
        const mockClient = {
            query: jest.fn().mockImplementation(async (sql, params) => {
                mockQueries.push({ sql, params });
                return { rows: [] };
            })
        };

        const result = await withTenantContext(mockClient, 5, async (client) => {
            await client.query('SELECT * FROM patients WHERE id = $1', ['uuid-123']);
            return 'success_data';
        });

        expect(result).toBe('success_data');
        expect(mockQueries[0].sql).toBe('BEGIN');
        expect(mockQueries[1].sql).toBe("SELECT set_config('app.current_tenant', $1, true)");
        expect(mockQueries[1].params).toEqual(['5']);
        expect(mockQueries[2].sql).toBe('SELECT * FROM patients WHERE id = $1');
        expect(mockQueries[3].sql).toBe('COMMIT');
    });

    test('withTenantContext executes ROLLBACK on error', async () => {
        const mockQueries = [];
        const mockClient = {
            query: jest.fn().mockImplementation(async (sql) => {
                mockQueries.push(sql);
                return { rows: [] };
            })
        };

        await expect(withTenantContext(mockClient, 1, async () => {
            throw new Error('Simulation database failure');
        })).rejects.toThrow('Simulation database failure');

        expect(mockQueries).toContain('BEGIN');
        expect(mockQueries).toContain('ROLLBACK');
        expect(mockQueries).not.toContain('COMMIT');
    });
});
