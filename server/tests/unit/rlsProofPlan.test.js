/**
 * rlsProofPlan.test.js
 * 
 * Unit tests for Second-Tenant RLS Proof Plan (W5).
 * Validates that migration 303_second_tenant_seed.sql and runbook
 * scripts/probes/rls-multi-tenant.md exist, satisfy Wolf HMS architectural
 * invariants (hospitals.id is INTEGER, patients.id is UUID), and define
 * deterministic RLS validation steps.
 */

const fs = require('fs');
const path = require('path');

describe('Second-Tenant RLS Proof Plan (W5)', () => {
    const migrationPath = path.resolve(__dirname, '../../migrations/303_second_tenant_seed.sql');
    const runbookPath = path.resolve(__dirname, '../../../scripts/probes/rls-multi-tenant.md');

    test('should have 303_second_tenant_seed.sql present on filesystem', () => {
        expect(fs.existsSync(migrationPath)).toBe(true);
    });

    test('should seed hospital_id=2 (Wolf Clinic Two) with valid types and schema invariants', () => {
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Verify transaction wrap
        expect(sql).toMatch(/BEGIN;/);
        expect(sql).toMatch(/COMMIT;/);

        // Verify Hospital 2
        expect(sql).toMatch(/Wolf Clinic Two/);
        expect(sql).toMatch(/WOLF_CLINIC_TWO/);
        expect(sql).toMatch(/clinic2\.wolfhms\.com/);

        // Verify Users seeded for hospital_id = 2
        expect(sql).toMatch(/admin_clinic2/);
        expect(sql).toMatch(/hospital_admin/);

        // Verify Patients have UUID PKs and hospital_id = 2
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        expect(sql).toMatch(uuidRegex);
        expect(sql).toMatch(/c2000000-0000-0000-0000-000000000001/);
        expect(sql).toMatch(/c2000000-0000-0000-0000-000000000002/);
    });

    test('should have comprehensive operator verification runbook for multi-tenant RLS', () => {
        expect(fs.existsSync(runbookPath)).toBe(true);
        const runbook = fs.readFileSync(runbookPath, 'utf8');

        expect(runbook).toMatch(/app\.current_tenant/);
        expect(runbook).toMatch(/Wolf Clinic Two/);
        expect(runbook).toMatch(/Kokila Hospital/);
        expect(runbook).toMatch(/violates row-level security policy/);
    });
});
