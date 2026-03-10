/**
 * Seed Ward Data to Cloud
 * Seeds wards, beds, patients, admissions, vitals for Ward Management Dashboard
 */

const axios = require('axios');
const CLOUD_URL = 'https://wolf-hms-server-1026194439642.asia-south1.run.app';

async function execSql(query) {
    try {
        // Get a token first by logging in
        console.log(`[EXEC] ${query.substring(0, 80)}...`);
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        return res.data;
    } catch (e) {
        console.error(`[ERROR] ${e.message}`);
        if (e.response) console.error(JSON.stringify(e.response.data));
        return { error: e.message };
    }
}

async function seed() {
    console.log('🌱 Starting Ward Data Seed to Cloud...\n');

    try {
        // 1. Check/Insert Wards
        console.log('📌 Step 1: Seeding Wards...');
        const wards = [
            { name: 'General Ward A', type: 'General', capacity: 20, description: 'General ward for male patients' },
            { name: 'ICU', type: 'ICU', capacity: 10, description: 'Intensive Care Unit' },
            { name: 'Maternity Ward', type: 'Maternity', capacity: 15, description: 'Maternity and delivery ward' },
            { name: 'Pediatric Ward', type: 'Pediatric', capacity: 12, description: 'Children ward' }
        ];

        for (const ward of wards) {
            await execSql(`
                INSERT INTO wards (name, type, capacity, description, hospital_id)
                VALUES ('${ward.name}', '${ward.type}', ${ward.capacity}, '${ward.description}', 1)
                ON CONFLICT (name) DO NOTHING
            `);
            console.log(`  ✅ Ward: ${ward.name}`);
        }

        // 2. Get ward IDs and create beds
        console.log('\n📌 Step 2: Seeding Beds...');
        
        // Get General Ward ID
        const generalWard = await execSql("SELECT id FROM wards WHERE name = 'General Ward A' LIMIT 1");
        const icuWard = await execSql("SELECT id FROM wards WHERE name = 'ICU' LIMIT 1");
        const maternityWard = await execSql("SELECT id FROM wards WHERE name = 'Maternity Ward' LIMIT 1");
        const pediatricWard = await execSql("SELECT id FROM wards WHERE name = 'Pediatric Ward' LIMIT 1");

        const wardIds = {
            general: generalWard.rows?.[0]?.id || 1,
            icu: icuWard.rows?.[0]?.id || 2,
            maternity: maternityWard.rows?.[0]?.id || 3,
            pediatric: pediatricWard.rows?.[0]?.id || 4
        };

        // Create beds for each ward
        const bedConfigs = [
            { wardId: wardIds.general, prefix: 'GW', count: 10 },
            { wardId: wardIds.icu, prefix: 'ICU', count: 5 },
            { wardId: wardIds.maternity, prefix: 'MAT', count: 5 },
            { wardId: wardIds.pediatric, prefix: 'PED', count: 5 }
        ];

        for (const config of bedConfigs) {
            for (let i = 1; i <= config.count; i++) {
                await execSql(`
                    INSERT INTO beds (ward_id, bed_number, status, hospital_id)
                    VALUES (${config.wardId}, '${config.prefix}-${i}', 'Available', 1)
                    ON CONFLICT (ward_id, bed_number) DO NOTHING
                `);
            }
            console.log(`  ✅ Created ${config.count} beds for ward ${config.prefix}`);
        }

        // 3. Create Demo Patients
        console.log('\n📌 Step 3: Seeding Demo Patients...');
        const demoPatients = [
            { name: 'Rajesh Kumar', age: 55, gender: 'Male', phone: '9876543210', address: '45, MG Road, Bangalore', ward: 'General Ward A', bed: 'GW-1', diagnosis: 'Pneumonia with COPD exacerbation' },
            { name: 'Priya Sharma', age: 32, gender: 'Female', phone: '9876543211', address: '12, Residency Road, Bangalore', ward: 'General Ward A', bed: 'GW-2', diagnosis: 'Post-operative cholecystectomy Day 2' },
            { name: 'Mohammed Ali', age: 68, gender: 'Male', phone: '9876543212', address: '78, Commercial Street, Bangalore', ward: 'ICU', bed: 'ICU-1', diagnosis: 'Acute MI - Post PCI monitoring' },
            { name: 'Lakshmi Devi', age: 45, gender: 'Female', phone: '9876543213', address: '23, Jayanagar, Bangalore', ward: 'General Ward A', bed: 'GW-3', diagnosis: 'Diabetic Ketoacidosis - Recovering' },
            { name: 'Venkatesh Rao', age: 72, gender: 'Male', phone: '9876543214', address: '56, Indiranagar, Bangalore', ward: 'ICU', bed: 'ICU-2', diagnosis: 'Sepsis secondary to UTI' }
        ];

        for (const patient of demoPatients) {
            // Calculate DOB from age
            const year = new Date().getFullYear() - patient.age;
            const dob = `${year}-01-15`;

            // Check if patient exists by phone
            const existCheck = await execSql(`SELECT id FROM patients WHERE phone = '${patient.phone}' LIMIT 1`);
            
            let patientId;
            if (!existCheck.rows || existCheck.rows.length === 0) {
                // Create patient
                const insertResult = await execSql(`
                    INSERT INTO patients (name, dob, gender, phone, address, hospital_id)
                    VALUES ('${patient.name}', '${dob}', '${patient.gender}', '${patient.phone}', '${patient.address}', 1)
                    RETURNING id
                `);
                patientId = insertResult.rows?.[0]?.id;
                console.log(`  ✅ Created patient: ${patient.name} (ID: ${patientId})`);
            } else {
                patientId = existCheck.rows[0].id;
                console.log(`  ⏩ Patient exists: ${patient.name} (ID: ${patientId})`);
            }

            if (patientId) {
                // Check if already admitted
                const admCheck = await execSql(`SELECT id FROM admissions WHERE patient_id = ${patientId} AND status = 'Admitted' LIMIT 1`);
                
                if (!admCheck.rows || admCheck.rows.length === 0) {
                    // Create admission
                    const admResult = await execSql(`
                        INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, diagnosis, hospital_id)
                        VALUES (${patientId}, '${patient.ward}', '${patient.bed}', 'Admitted', NOW(), '${patient.diagnosis}', 1)
                        RETURNING id
                    `);
                    const admissionId = admResult.rows?.[0]?.id;
                    console.log(`    🛏️ Admitted to ${patient.bed} (${patient.ward})`);

                    // Update bed status to Occupied
                    await execSql(`UPDATE beds SET status = 'Occupied' WHERE bed_number = '${patient.bed}'`);

                    // Log initial vitals
                    if (admissionId) {
                        const vitals = {
                            bp: patient.name.includes('Venkatesh') ? '85/50' : '120/80',
                            temp: patient.name.includes('Venkatesh') ? '103.5' : '98.6',
                            spo2: patient.name.includes('Venkatesh') ? '88' : '98',
                            heart_rate: patient.name.includes('Venkatesh') ? '125' : '78'
                        };
                        
                        await execSql(`
                            INSERT INTO vitals_logs (admission_id, patient_id, bp, temp, spo2, heart_rate, recorded_by, hospital_id)
                            VALUES (${admissionId}, ${patientId}, '${vitals.bp}', '${vitals.temp}', '${vitals.spo2}', '${vitals.heart_rate}', 1, 1)
                        `);
                        console.log(`    📊 Vitals logged: BP ${vitals.bp}, SpO2 ${vitals.spo2}%`);
                    }
                } else {
                    console.log(`    ⏩ Already admitted: ${patient.bed}`);
                }
            }
        }

        // 4. Create a ward incharge user
        console.log('\n📌 Step 4: Creating Ward Incharge User...');
        const wardInchargeCheck = await execSql("SELECT id FROM users WHERE username = 'ward_incharge'");
        if (!wardInchargeCheck.rows || wardInchargeCheck.rows.length === 0) {
            // Using same hash as admin_user for password123
            const hash = '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFpW';
            await execSql(`
                INSERT INTO users (username, email, password, role, hospital_id, is_active, name)
                VALUES ('ward_incharge', 'wardincharge@wolfhms.com', '${hash}', 'ward_incharge', 1, true, 'Ward In-Charge')
            `);
            console.log('  ✅ Created user: ward_incharge (password: password123)');
        } else {
            console.log('  ⏩ Ward incharge user already exists');
        }

        console.log('\n🎉 Ward Data Seeding Complete!');
        console.log('\n📋 Summary:');
        console.log('   - 4 wards created (General Ward A, ICU, Maternity, Pediatric)');
        console.log('   - 25 beds created across all wards');
        console.log('   - 5 demo patients admitted with vitals');
        console.log('   - Ward incharge user created\n');

    } catch (e) {
        console.error('❌ Seeding Failed:', e);
    }
}

seed();
