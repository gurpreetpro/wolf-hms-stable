const { pool } = require('../db');

async function createTransferSchema() {
    console.log('Creating patient transfer and billing schema...\n');

    try {
        // 1. Create bed_stay_segments table
        console.log('1. Creating bed_stay_segments table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bed_stay_segments (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER,
                patient_id UUID,
                bed_id INTEGER,
                ward_id INTEGER,
                bed_type VARCHAR(50),
                check_in TIMESTAMP NOT NULL,
                check_out TIMESTAMP,
                rate_per_12hr DECIMAL(10,2) DEFAULT 0,
                cycles_charged INTEGER DEFAULT 0,
                total_amount DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ bed_stay_segments table created');

        // 2. Create bed_transfers table
        console.log('2. Creating bed_transfers table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bed_transfers (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER,
                patient_id UUID,
                from_bed_id INTEGER,
                to_bed_id INTEGER,
                urgency VARCHAR(20) DEFAULT 'Routine',
                status VARCHAR(20) DEFAULT 'Pending',
                initiated_by INTEGER,
                initiated_from VARCHAR(20),
                assigned_doctor_id INTEGER,
                approval_doctor_id INTEGER,
                rejection_reason TEXT,
                transfer_reason TEXT,
                notes TEXT,
                requested_at TIMESTAMP DEFAULT NOW(),
                approved_at TIMESTAMP,
                completed_at TIMESTAMP
            )
        `);
        console.log('   ✅ bed_transfers table created');

        // 3. Add rate_per_12hr to beds table if not exists
        console.log('3. Adding rate_per_12hr column to beds table...');
        await pool.query(`
            ALTER TABLE beds ADD COLUMN IF NOT EXISTS rate_per_12hr DECIMAL(10,2) DEFAULT 1000
        `);
        console.log('   ✅ rate_per_12hr column added to beds');

        // 4. Add patient_id to beds for tracking current occupant
        console.log('4. Adding patient tracking columns to beds...');
        await pool.query(`
            ALTER TABLE beds ADD COLUMN IF NOT EXISTS patient_id UUID
        `);
        await pool.query(`
            ALTER TABLE beds ADD COLUMN IF NOT EXISTS admission_id INTEGER
        `);
        console.log('   ✅ patient tracking columns added');

        // 5. Create indexes for performance
        console.log('5. Creating indexes...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_bed_stay_segments_admission 
            ON bed_stay_segments(admission_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_bed_transfers_status 
            ON bed_transfers(status)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_bed_transfers_doctor 
            ON bed_transfers(assigned_doctor_id)
        `);
        console.log('   ✅ Indexes created');

        console.log('\n✅ All schema changes completed successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    process.exit();
}

createTransferSchema();
