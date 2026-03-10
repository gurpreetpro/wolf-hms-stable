// Run migration 070 - Multi-Tenancy Foundation
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigration() {
    try {
        console.log('🔄 Running migration 070_multi_tenancy_foundation.sql...');
        
        const migrationPath = path.join(__dirname, 'migrations', '070_multi_tenancy_foundation.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        await pool.query(sql);
        
        console.log('✅ Migration 070 completed successfully!');
        
        // Verify tables created
        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('hospitals', 'hospital_assets', 'hospital_admins', 'hospital_audit_log')
        `);
        
        console.log('📋 Tables created:', result.rows.map(r => r.table_name).join(', '));
        
        // Check default hospital
        const hospitals = await pool.query('SELECT id, code, name, subdomain FROM hospitals');
        console.log('🏥 Hospitals:', hospitals.rows);
        
    } catch (err) {
        console.error('❌ Migration error:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
