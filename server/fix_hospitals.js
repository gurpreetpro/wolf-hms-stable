const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const PASSWORD = 'password123';

async function migrate() {
    try {
        console.log('🔧 WOLF HMS - Database Cleanup & Super Admin Setup');
        console.log('='.repeat(60));

        // 1. NUCLEAR RESET - Wipe hospitals and users for clean slate
        console.log('\n1️⃣ Wiping tables for clean slate...');
        await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE hospitals RESTART IDENTITY CASCADE');
        console.log('   ✅ Wiped users and hospitals tables');

        // 2. Insert 3 unique hospitals
        console.log('\n2️⃣ Setting up 3 unique hospitals...');
        const hospitals = [
            { id: 1, code: 'kokila', name: 'Kokila Hospital', domain: 'kokila.wolfsecurity.in' },
            { id: 2, code: 'taneja', name: 'Taneja Hospital', domain: 'taneja.wolfsecurity.in' },
            { id: 3, code: 'drparveen', name: 'Dr. Parveen Clinic', domain: 'drparveen.wolfsecurity.in' }
        ];

        for (const h of hospitals) {
            await pool.query(`
                INSERT INTO hospitals (id, code, name, subdomain)
                VALUES ($1, $2, $3, $4)
            `, [h.id, h.code, h.name, h.domain]);
            console.log(`   ✅ [${h.id}] ${h.name} (${h.domain})`);
        }

        // 3. Setup admin users per hospital
        console.log('\n3️⃣ Setting up hospital admins...');
        const hashedPassword = await bcrypt.hash(PASSWORD, 10);

        const admins = [
            { username: 'admin_kokila', email: 'admin@kokila.com', hospital_id: 1, role: 'admin', full_name: 'Kokila Admin' },
            { username: 'admin_taneja', email: 'admin@taneja.com', hospital_id: 2, role: 'admin', full_name: 'Dr. Taneja (Admin)' },
            { username: 'admin_parveen', email: 'parveen@gmail.com', hospital_id: 3, role: 'admin', full_name: 'Dr. Parveen (Admin)' }
        ];

        for (const u of admins) {
            // Delete old if exists
            await pool.query('DELETE FROM users WHERE username = $1', [u.username]);
            
            await pool.query(`
                INSERT INTO users (username, email, password, role, hospital_id, is_active, approval_status, full_name)
                VALUES ($1, $2, $3, $4, $5, true, 'APPROVED', $6)
            `, [u.username, u.email, hashedPassword, u.role, u.hospital_id, u.full_name]);
            console.log(`   ✅ ${u.username} -> ${u.full_name} (Hospital ${u.hospital_id})`);
        }

        // 4. Setup Super Admin / Developer accounts
        console.log('\n4️⃣ Setting up Super Admin (Developer)...');
        
        // Delete old developer accounts
        await pool.query("DELETE FROM users WHERE username IN ('admin_user', 'gurpreetpro')");

        const superAdmins = [
            { 
                username: 'gurpreetpro', 
                email: 'gurpreetpro@gmail.com', 
                role: 'super_admin', 
                full_name: 'WOLF TECHNOLOGIES INDIA',
                hospital_id: null  // Super Admin is platform-wide, not tied to one hospital
            },
            { 
                username: 'admin_user', 
                email: 'admin@wolf-hms.com', 
                role: 'super_admin', 
                full_name: 'System Developer',
                hospital_id: null
            }
        ];

        for (const u of superAdmins) {
            await pool.query(`
                INSERT INTO users (username, email, password, role, hospital_id, is_active, approval_status, full_name)
                VALUES ($1, $2, $3, $4, $5, true, 'APPROVED', $6)
            `, [u.username, u.email, hashedPassword, u.role, u.hospital_id, u.full_name]);
            console.log(`   ✅ ${u.username} -> ${u.role.toUpperCase()} (Platform-Wide)`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration Complete!');
        console.log('='.repeat(60));
        
        console.log('\n📋 FINAL STRUCTURE:');
        console.log('─'.repeat(60));
        console.log('HOSPITALS:');
        console.log('  [1] Kokila Hospital     | admin_kokila     | password123');
        console.log('  [2] Taneja Hospital     | admin_taneja     | password123');
        console.log('  [3] Dr. Parveen Clinic  | admin_parveen    | password123');
        console.log('');
        console.log('SUPER ADMINS (Developer - YOU):');
        console.log('  gurpreetpro             | gurpreetpro@gmail.com | password123');
        console.log('  admin_user              | admin@wolf-hms.com    | password123');
        console.log('─'.repeat(60));

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
}

migrate();
