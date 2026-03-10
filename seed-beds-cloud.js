/**
 * Seed beds and patients to cloud - Simplified version with proper escaping
 */
const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';

async function execSql(query) {
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        return res.data;
    } catch (e) {
        console.error('SQL Error:', query.substring(0, 100));
        if (e.response) console.error('Response:', e.response.data);
        throw e;
    }
}

async function seed() {
    console.log('🌱 Seeding Beds & Patients...\n');

    try {
        // Step 1: Create beds for ward 1 (General Ward A) - 10 beds
        console.log('📌 Creating beds for General Ward A...');
        for (let i = 1; i <= 10; i++) {
            await execSql(`INSERT INTO beds (ward_id, bed_number, status, hospital_id) VALUES (1, 'GW-${i}', 'Available', 1) ON CONFLICT DO NOTHING`);
        }
        console.log('  ✅ 10 beds created');

        // Step 2: Create beds for ward 2 (ICU) - 5 beds
        console.log('📌 Creating beds for ICU...');
        for (let i = 1; i <= 5; i++) {
            await execSql(`INSERT INTO beds (ward_id, bed_number, status, hospital_id) VALUES (2, 'ICU-${i}', 'Available', 1) ON CONFLICT DO NOTHING`);
        }
        console.log('  ✅ 5 beds created');

        // Step 3: Create beds for ward 3 (Maternity) - 5 beds
        console.log('📌 Creating beds for Maternity Ward...');
        for (let i = 1; i <= 5; i++) {
            await execSql(`INSERT INTO beds (ward_id, bed_number, status, hospital_id) VALUES (3, 'MAT-${i}', 'Available', 1) ON CONFLICT DO NOTHING`);
        }
        console.log('  ✅ 5 beds created');

        // Step 4: Create beds for ward 4 (Pediatric) - 5 beds
        console.log('📌 Creating beds for Pediatric Ward...');
        for (let i = 1; i <= 5; i++) {
            await execSql(`INSERT INTO beds (ward_id, bed_number, status, hospital_id) VALUES (4, 'PED-${i}', 'Available', 1) ON CONFLICT DO NOTHING`);
        }
        console.log('  ✅ 5 beds created');

        // Verify beds
        const bedCount = await execSql("SELECT COUNT(*) as cnt FROM beds");
        console.log('\n📊 Total beds now:', bedCount.rows[0].cnt);

        // Step 5: Create patients and admissions
        console.log('\n📌 Creating patients...');
        
        // Patient 1
        let res = await execSql("SELECT id FROM patients WHERE phone = '9876543210'");
        if (res.rows.length === 0) {
            await execSql("INSERT INTO patients (name, dob, gender, phone, address, hospital_id) VALUES ('Rajesh Kumar', '1970-01-15', 'Male', '9876543210', 'Bangalore', 1)");
            console.log('  ✅ Created Rajesh Kumar');
        } else {
            console.log('  ⏩ Rajesh Kumar exists');
        }
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543210'");
        if (res.rows.length > 0) {
            const pid = res.rows[0].id;
            const adm = await execSql(`SELECT id FROM admissions WHERE patient_id = ${pid} AND status = 'Admitted'`);
            if (adm.rows.length === 0) {
                await execSql(`INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, diagnosis, hospital_id) VALUES (${pid}, 'General Ward A', 'GW-1', 'Admitted', NOW(), 'Pneumonia', 1)`);
                await execSql("UPDATE beds SET status = 'Occupied' WHERE bed_number = 'GW-1'");
                console.log('    🛏️ Admitted to GW-1');
            }
        }

        // Patient 2
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543211'");
        if (res.rows.length === 0) {
            await execSql("INSERT INTO patients (name, dob, gender, phone, address, hospital_id) VALUES ('Priya Sharma', '1993-05-20', 'Female', '9876543211', 'Bangalore', 1)");
            console.log('  ✅ Created Priya Sharma');
        }
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543211'");
        if (res.rows.length > 0) {
            const pid = res.rows[0].id;
            const adm = await execSql(`SELECT id FROM admissions WHERE patient_id = ${pid} AND status = 'Admitted'`);
            if (adm.rows.length === 0) {
                await execSql(`INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, diagnosis, hospital_id) VALUES (${pid}, 'General Ward A', 'GW-2', 'Admitted', NOW(), 'Post-op care', 1)`);
                await execSql("UPDATE beds SET status = 'Occupied' WHERE bed_number = 'GW-2'");
                console.log('    🛏️ Admitted to GW-2');
            }
        }

        // Patient 3 - ICU
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543212'");
        if (res.rows.length === 0) {
            await execSql("INSERT INTO patients (name, dob, gender, phone, address, hospital_id) VALUES ('Mohammed Ali', '1957-03-10', 'Male', '9876543212', 'Bangalore', 1)");
            console.log('  ✅ Created Mohammed Ali');
        }
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543212'");
        if (res.rows.length > 0) {
            const pid = res.rows[0].id;
            const adm = await execSql(`SELECT id FROM admissions WHERE patient_id = ${pid} AND status = 'Admitted'`);
            if (adm.rows.length === 0) {
                await execSql(`INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, diagnosis, hospital_id) VALUES (${pid}, 'ICU', 'ICU-1', 'Admitted', NOW(), 'Acute MI', 1)`);
                await execSql("UPDATE beds SET status = 'Occupied' WHERE bed_number = 'ICU-1'");
                console.log('    🛏️ Admitted to ICU-1');
            }
        }

        // Patient 4
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543213'");
        if (res.rows.length === 0) {
            await execSql("INSERT INTO patients (name, dob, gender, phone, address, hospital_id) VALUES ('Lakshmi Devi', '1980-08-25', 'Female', '9876543213', 'Bangalore', 1)");
            console.log('  ✅ Created Lakshmi Devi');
        }
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543213'");
        if (res.rows.length > 0) {
            const pid = res.rows[0].id;
            const adm = await execSql(`SELECT id FROM admissions WHERE patient_id = ${pid} AND status = 'Admitted'`);
            if (adm.rows.length === 0) {
                await execSql(`INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, diagnosis, hospital_id) VALUES (${pid}, 'General Ward A', 'GW-3', 'Admitted', NOW(), 'DKA Recovery', 1)`);
                await execSql("UPDATE beds SET status = 'Occupied' WHERE bed_number = 'GW-3'");
                console.log('    🛏️ Admitted to GW-3');
            }
        }

        // Patient 5 - ICU Critical
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543214'");
        if (res.rows.length === 0) {
            await execSql("INSERT INTO patients (name, dob, gender, phone, address, hospital_id) VALUES ('Venkatesh Rao', '1953-11-05', 'Male', '9876543214', 'Bangalore', 1)");
            console.log('  ✅ Created Venkatesh Rao');
        }
        res = await execSql("SELECT id FROM patients WHERE phone = '9876543214'");
        if (res.rows.length > 0) {
            const pid = res.rows[0].id;
            const adm = await execSql(`SELECT id FROM admissions WHERE patient_id = ${pid} AND status = 'Admitted'`);
            if (adm.rows.length === 0) {
                await execSql(`INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, diagnosis, hospital_id) VALUES (${pid}, 'ICU', 'ICU-2', 'Admitted', NOW(), 'Sepsis', 1)`);
                await execSql("UPDATE beds SET status = 'Occupied' WHERE bed_number = 'ICU-2'");
                console.log('    🛏️ Admitted to ICU-2');
            }
        }

        // Final status
        console.log('\n📊 Final Counts:');
        const beds = await execSql("SELECT COUNT(*) as cnt FROM beds WHERE hospital_id = 1");
        console.log('  Beds:', beds.rows[0].cnt);
        const avail = await execSql("SELECT COUNT(*) as cnt FROM beds WHERE status = 'Available' AND hospital_id = 1");
        console.log('  Available:', avail.rows[0].cnt);
        const occupied = await execSql("SELECT COUNT(*) as cnt FROM beds WHERE status = 'Occupied' AND hospital_id = 1");
        console.log('  Occupied:', occupied.rows[0].cnt);
        const patients = await execSql("SELECT COUNT(*) as cnt FROM patients WHERE hospital_id = 1");
        console.log('  Patients:', patients.rows[0].cnt);
        const admissions = await execSql("SELECT COUNT(*) as cnt FROM admissions WHERE status = 'Admitted' AND hospital_id = 1");
        console.log('  Active Admissions:', admissions.rows[0].cnt);

        console.log('\n🎉 Done!');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

seed();
