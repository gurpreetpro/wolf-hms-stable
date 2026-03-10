const pool = require('./config/db');

async function fixRoleConstraint() {
    try {
        console.log('🔧 Updating users_role_check constraint...');
        
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        
        await pool.query(`
            ALTER TABLE users
            ADD CONSTRAINT users_role_check CHECK (
                role IN (
                    'admin',
                    'super_admin',
                    'platform_owner',
                    'doctor',
                    'nurse',
                    'receptionist',
                    'lab_tech',
                    'pharmacist',
                    'anaesthetist',
                    'security_guard',
                    'patient',
                    'user',
                    'ward_incharge',
                    'radiologist',
                    'billing',
                    'blood_bank_tech',
                    'housekeeping'
                )
            )
        `);
        
        console.log('✅ Constraint updated - super_admin and platform_owner roles now allowed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixRoleConstraint();
