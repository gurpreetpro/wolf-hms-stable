const axios = require('axios');
const bcrypt = require('bcrypt');
const CLOUD_URL = 'https://wolf-hms-1026194439642.asia-south1.run.app';

async function execSql(query) {
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        return res.data;
    } catch (e) {
        console.error(`[ERROR] ${e.message}`);
        if(e.response) console.error(JSON.stringify(e.response.data));
    }
}

async function createStaff() {
    console.log('👥 Creating Mobile Staff Users...');

    const staff = [
        { username: 'mobile_doctor', role: 'doctor', email: 'mobile_dr@test.com', dept: 'Cardiology' },
        { username: 'mobile_nurse', role: 'nurse', email: 'mobile_nurse@test.com', dept: 'ICU' },
        { username: 'mobile_reception', role: 'receptionist', email: 'mobile_recep@test.com', dept: 'Front Desk' }, // Changed to receptionist
        { username: 'mobile_lab', role: 'technician', email: 'mobile_lab@test.com', dept: 'Pathology' }, // Changed to technician
        { username: 'mobile_pharmacy', role: 'pharmacist', email: 'mobile_pharma@test.com', dept: 'Pharmacy' }
    ];

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    for (const u of staff) {
        // Check exist
        const check = await execSql(`SELECT id FROM users WHERE username = '${u.username}'`);
        if (check && check.rows && check.rows.length > 0) {
            console.log(`✅ User ${u.username} already exists.`);
            continue;
        }

        // Create
        // Note: 'pharmacist' role might be 'pharmacy' in some parts of app, but 'pharmacist' is standard in authController demo.
        const sql = `
            INSERT INTO users (username, password, role, is_active, email, approval_status, department) 
            VALUES ('${u.username}', '${hash}', '${u.role}', true, '${u.email}', 'APPROVED', '${u.dept}') 
            RETURNING id, username, role
        `;

        try {
            const res = await execSql(sql);
            if (res && res.rows && res.rows.length > 0) {
                console.log(`✅ Created: ${u.username} (${u.role})`);
            } else {
                console.log(`⚠️ Failed to create ${u.username}`);
            }
        } catch (e) {
            console.log(`❌ Error creating ${u.username}: ${e.message}`);
        }
    }
}

createStaff();
