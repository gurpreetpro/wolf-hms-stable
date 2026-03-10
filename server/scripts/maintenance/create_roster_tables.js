const pool = require('./config/db');

async function createRosterTables() {
    try {
        console.log('Creating nurse_assignments table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS nurse_assignments (
                id SERIAL PRIMARY KEY,
                nurse_id INTEGER REFERENCES users(id),
                ward_id INTEGER REFERENCES wards(id),
                shift_type VARCHAR(20) NOT NULL, -- 'Morning', 'Evening', 'Night', 'General'
                assignment_date DATE NOT NULL,
                bed_ids JSONB DEFAULT '[]', -- List of bed IDs
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(nurse_id, assignment_date, shift_type) -- One assignment per nurse per shift
            );
        `);

        console.log('✅ nurse_assignments table created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating tables:', err);
        process.exit(1);
    }
}

createRosterTables();
