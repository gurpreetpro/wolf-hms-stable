/**
 * auditExport.test.js — Contract tests for Super-Admin Audit Export Endpoint
 * 
 * Part of Wolf HMS Phase 5 Hardening (W2).
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_phase5_audit_export';
process.env.JWT_ISSUER = 'wolf-hms';
process.env.JWT_AUDIENCE = 'wolf-hms-api';

const mockQuery = jest.fn();
jest.mock('../../config/db', () => ({
    query: (...args) => mockQuery(...args)
}));

const auditExportRoutes = require('../../routes/auditExportRoutes');

const app = express();
app.use(express.json());
app.use('/api/admin/audit', auditExportRoutes);

describe('CONTRACT: Super-Admin Audit Export (Phase 5 W2)', () => {
    const superAdminToken = jwt.sign(
        { id: 1, role: 'super_admin', username: 'superadmin_test', hospital_id: null },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'wolf-hms', audience: 'wolf-hms-api' }
    );

    const regularAdminToken = jwt.sign(
        { id: 2, role: 'admin', username: 'admin_test', hospital_id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'wolf-hms', audience: 'wolf-hms-api' }
    );

    const doctorToken = jwt.sign(
        { id: 3, role: 'doctor', username: 'doctor_test', hospital_id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'wolf-hms', audience: 'wolf-hms-api' }
    );

    beforeEach(() => {
        mockQuery.mockReset();
    });

    test('1. Unauthenticated request: returns 401 Unauthorized', async () => {
        const res = await request(app).get('/api/admin/audit/export');
        expect(res.status).toBe(401);
    });

    test('2. Unauthorized role: returns 403 Forbidden for non-super_admin roles', async () => {
        const adminRes = await request(app)
            .get('/api/admin/audit/export')
            .set('Authorization', `Bearer ${regularAdminToken}`);
        expect(adminRes.status).toBe(403);

        const doctorRes = await request(app)
            .get('/api/admin/audit/export')
            .set('Authorization', `Bearer ${doctorToken}`);
        expect(doctorRes.status).toBe(403);
    });

    test('3. Super-Admin CSV export: returns 200 with valid CSV content and required headers', async () => {
        const sampleRows = [
            {
                id: 'uuid-1',
                created_at: new Date('2026-09-16T10:00:00Z'),
                user_id: 42,
                action: 'READ',
                resource_type: 'patients',
                resource_id: 'pat-100',
                prev_hash: 'GENESIS',
                record_hash: 'a1b2c3d4e5f60000000000000000000000000000000000000000000000000000'
            },
            {
                id: 'uuid-2',
                created_at: new Date('2026-09-16T10:05:00Z'),
                user_id: 42,
                action: 'CREATE',
                resource_type: 'prescriptions',
                resource_id: 'rx-200',
                prev_hash: 'a1b2c3d4e5f60000000000000000000000000000000000000000000000000000',
                record_hash: 'b2c3d4e5f6a10000000000000000000000000000000000000000000000000000'
            }
        ];

        mockQuery.mockResolvedValueOnce({ rows: sampleRows });

        const res = await request(app)
            .get('/api/admin/audit/export')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment; filename="hipaa_audit_export_');

        const csv = res.text;
        const lines = csv.split('\r\n');
        expect(lines[0]).toBe('id,timestamp,user_id,action,resource_type,resource_id,prev_hash,record_hash');
        expect(lines[1]).toContain('uuid-1,2026-09-16T10:00:00.000Z,42,READ,patients,pat-100,GENESIS');
        expect(lines[2]).toContain('uuid-2,2026-09-16T10:05:00.000Z,42,CREATE,prescriptions,rx-200');
    });

    test('4. Date filters: applies from and to parameters to database query', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/admin/audit/export?from=2026-09-01&to=2026-09-15')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('created_at >= $1');
        expect(sql).toContain('created_at <= $2');
        expect(params[0]).toBe(new Date('2026-09-01').toISOString());
        expect(params[1]).toBe(new Date('2026-09-15').toISOString());
    });

    test('5. JSON format export: returns JSON structure when format=json is specified', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 'row-1',
                    created_at: new Date('2026-09-16T08:00:00Z'),
                    user_id: 10,
                    action: 'UPDATE',
                    resource_type: 'invoices',
                    resource_id: 'inv-99',
                    prev_hash: 'GENESIS',
                    record_hash: 'hash123'
                }
            ]
        });

        const res = await request(app)
            .get('/api/admin/audit/export?format=json')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(1);
        expect(res.body.data[0].id).toBe('row-1');
    });
});
