/**
 * Finish RLS Setup - Create function and policies
 * Usage: node finish_rls_setup.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hospital456!@localhost:5432/hospital_db',
    ssl: false
});

async function main() {
    console.log('🔧 Finishing RLS Setup...\n');
    
    try {
        // Step 1: Create the tenant function
        console.log('1. Creating current_tenant_id() function...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS INTEGER AS $$
            BEGIN
                RETURN NULLIF(current_setting('app.current_tenant', true), '')::INTEGER;
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql STABLE;
        `);
        console.log('   ✓ Function created');

        // Step 2: Create policies for each table
        const tables = [
            'patients', 'admissions', 'opd_visits', 'lab_requests', 
            'lab_results', 'invoices', 'payments', 'prescriptions',
            'care_tasks', 'vitals_logs', 'inventory_items'
        ];

        console.log('\n2. Creating tenant isolation policies...');
        for (const table of tables) {
            try {
                await pool.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
                await pool.query(`
                    CREATE POLICY tenant_isolation_${table} ON ${table}
                    FOR ALL
                    USING (hospital_id = current_tenant_id() OR current_tenant_id() IS NULL)
                    WITH CHECK (hospital_id = current_tenant_id() OR current_tenant_id() IS NULL)
                `);
                console.log(`   ✓ ${table}`);
            } catch (e) {
                console.log(`   ⚠ ${table}: ${e.message.substring(0, 50)}`);
            }
        }

        // Step 3: Users table with special handling
        console.log('\n3. Creating users policy (with admin bypass)...');
        await pool.query(`DROP POLICY IF EXISTS tenant_isolation_users ON users`);
        await pool.query(`
            CREATE POLICY tenant_isolation_users ON users
            FOR ALL
            USING (
                hospital_id = current_tenant_id() 
                OR current_tenant_id() IS NULL
                OR role IN ('super_admin', 'platform_owner')
            )
            WITH CHECK (
                hospital_id = current_tenant_id() 
                OR current_tenant_id() IS NULL
                OR role IN ('super_admin', 'platform_owner')
            )
        `);
        console.log('   ✓ users (with admin bypass)');

        // Step 4: Verify
        console.log('\n4. Verification...');
        await pool.query("SET app.current_tenant TO '1'");
        const h1 = await pool.query('SELECT COUNT(*) FROM patients');
        console.log(`   Hospital 1: ${h1.rows[0].count} patients`);

        await pool.query("SET app.current_tenant TO '2'");
        const h2 = await pool.query('SELECT COUNT(*) FROM patients');
        console.log(`   Hospital 2: ${h2.rows[0].count} patients`);

        // Reset context
        await pool.query("SET app.current_tenant TO ''");
        const all = await pool.query('SELECT COUNT(*) FROM patients');
        console.log(`   No tenant (bypass): ${all.rows[0].count} patients`);

        console.log('\n✅ RLS SETUP COMPLETE!');

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

main();
