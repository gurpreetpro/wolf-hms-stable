const { pool } = require('./db');

async function fixDoctorNames() {
    try {
        console.log('Fixing doctor names...\n');
        
        // Update doctors with missing names
        const updates = [
            { id: 420, name: 'Dr. Arun Patel', dept: 'General Medicine' },
            { id: 421, name: 'Dr. Rahul Verma', dept: 'Orthopedics' },
            { id: 490, name: 'Dr. Sneha Gupta', dept: 'Surgery' },
            { id: 507, name: 'Dr. Vikram Reddy', dept: 'Cardiology' },
        ];
        
        for (const doc of updates) {
            const result = await pool.query(
                'UPDATE users SET name = $1 WHERE id = $2 AND (name IS NULL OR name = \'\') RETURNING id, name',
                [doc.name, doc.id]
            );
            if (result.rows.length > 0) {
                console.log(`✅ Updated ID ${doc.id}: ${doc.name} - ${doc.dept}`);
            } else {
                console.log(`⏭️ Skipped ID ${doc.id}: already has a name`);
            }
        }
        
        console.log('\n=== UPDATED DOCTORS LIST ===\n');
        const doctors = await pool.query(`
            SELECT id, name, department FROM users 
            WHERE role = 'doctor' AND is_active = true
            ORDER BY name
        `);
        doctors.rows.forEach((d, i) => {
            console.log(`${i+1}. ${d.name} - ${d.department} (ID: ${d.id})`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

fixDoctorNames();
