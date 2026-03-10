const http = require('http');

const queries = [
    `CREATE TABLE IF NOT EXISTS lab_test_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        included_tests TEXT[],
        original_price NUMERIC(10,2),
        discounted_price NUMERIC(10,2),
        discount_percent INTEGER,
        is_popular BOOLEAN DEFAULT false,
        category VARCHAR(50),
        icon VARCHAR(50),
        hospital_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS home_collection_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID,
        hospital_id UUID,
        address TEXT,
        test_ids TEXT[],
        preferred_date DATE,
        preferred_time VARCHAR(20),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        assigned_to UUID
    )`,
    `CREATE TABLE IF NOT EXISTS home_collection_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slot_date DATE,
        slot_time VARCHAR(20),
        is_available BOOLEAN DEFAULT true,
        booked_count INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 5,
        zone_id VARCHAR(50),
        hospital_id UUID
    )`,
    `CREATE TABLE IF NOT EXISTS phlebotomist_locations (
        user_id UUID PRIMARY KEY,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        accuracy_meters INTEGER,
        battery_percent INTEGER,
        is_online BOOLEAN DEFAULT false,
        last_updated TIMESTAMP DEFAULT NOW(),
        hospital_id UUID
    )`,
    // Seed some data
    `INSERT INTO lab_test_packages (name, description, original_price, discounted_price, category, is_popular)
     SELECT 'Full Body Checks', 'Complete health checkup', 2000, 999, 'packages', true
     WHERE NOT EXISTS (SELECT 1 FROM lab_test_packages WHERE name = 'Full Body Checks')`
];

async function runQuery(q) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/debug/sql',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(JSON.stringify({ query: q }));
        req.end();
    });
}

async function setup() {
    console.log('🛠️ Setting up Home Lab Schema...');
    for (const q of queries) {
        try {
            console.log('Executing:', q.substring(0, 50) + '...');
            const res = await runQuery(q);
            console.log('Result:', res);
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
    console.log('✅ Schema Setup Complete');
}

setup();
