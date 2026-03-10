require('dotenv').config();
const pool = require('./config/db');

async function investigate() {
    console.log('=== LAB TEST PRICING INVESTIGATION ===\n');
    
    try {
        // 1. Get all hospitals
        console.log('1. HOSPITALS:');
        const hospitals = await pool.query('SELECT id, name, code FROM hospitals');
        console.log(hospitals.rows);
        
        // 2. Check lab_test_types structure per hospital
        console.log('\n2. LAB TESTS BY HOSPITAL_ID:');
        const testsByHospital = await pool.query(`
            SELECT hospital_id, COUNT(*) as test_count 
            FROM lab_test_types 
            GROUP BY hospital_id 
            ORDER BY hospital_id NULLS FIRST
        `);
        console.log(testsByHospital.rows);
        
        // 3. Sample: Check CBC test for each hospital
        console.log('\n3. SAMPLE TEST "CBC" BY HOSPITAL:');
        const cbcTests = await pool.query(`
            SELECT t.id, t.name, t.price, t.hospital_id, h.name as hospital_name
            FROM lab_test_types t
            LEFT JOIN hospitals h ON t.hospital_id = h.id
            WHERE t.name ILIKE '%CBC%'
            ORDER BY t.hospital_id NULLS FIRST
        `);
        console.log(cbcTests.rows);
        
        // 4. Check if Kokila has its own tests or uses shared (hospital_id = NULL)
        console.log('\n4. KOKILA HOSPITAL (ID=1) TESTS:');
        const kokilaTests = await pool.query(`
            SELECT COUNT(*) as count, hospital_id
            FROM lab_test_types 
            WHERE hospital_id = 1
            GROUP BY hospital_id
        `);
        console.log('Kokila-specific tests:', kokilaTests.rows);
        
        // 5. Check shared tests (hospital_id = NULL)
        const sharedTests = await pool.query(`
            SELECT COUNT(*) as count
            FROM lab_test_types 
            WHERE hospital_id IS NULL
        `);
        console.log('Shared tests (NULL hospital):', sharedTests.rows[0]);
        
        // 6. How getLabTests fetches tests
        console.log('\n5. SIMULATING getLabTests FOR KOKILA (hospital_id=1):');
        const kokilaFetch = await pool.query(`
            SELECT t.id, t.name, t.price, t.hospital_id
            FROM lab_test_types t 
            WHERE (t.hospital_id = 1 OR t.hospital_id IS NULL) 
            ORDER BY t.name
            LIMIT 10
        `);
        console.log('First 10 tests visible to Kokila:');
        console.log(kokilaFetch.rows);
        
        // 7. Check the admin price change approval endpoint
        console.log('\n6. CHECKING LAB ROUTES FOR ADMIN:');
        console.log('Need to check server/routes/labRoutes.js for direct price update endpoints');
        
        // 8. Check if there's a direct updateLabTest endpoint
        console.log('\n7. CHECKING FOR DIRECT PRICE UPDATE ENDPOINTS...');
        
        // 9. Check the frontend LabDashboard to see how it fetches tests
        console.log('\n8. PRICE PATTERN ANALYSIS:');
        const pricePattern = await pool.query(`
            SELECT 
                CASE 
                    WHEN hospital_id IS NULL THEN 'Shared'
                    ELSE 'Hospital-specific'
                END as type,
                COUNT(*) as count,
                AVG(price) as avg_price
            FROM lab_test_types
            GROUP BY CASE WHEN hospital_id IS NULL THEN 'Shared' ELSE 'Hospital-specific' END
        `);
        console.log(pricePattern.rows);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

investigate();
