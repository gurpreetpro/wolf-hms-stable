const pool = require('./config/db');

const testUpdate = async () => {
    try {
        console.log('Testing Bed Update...');

        const wardRes = await pool.query('SELECT name FROM wards LIMIT 1');
        if (wardRes.rows.length === 0) throw new Error('No wards found');
        const wardName = wardRes.rows[0].name;
        console.log('Ward:', wardName);

        const bedRes = await pool.query("SELECT bed_number FROM beds WHERE ward_id = (SELECT id FROM wards WHERE name = $1) LIMIT 1", [wardName]);
        if (bedRes.rows.length === 0) throw new Error(`No beds found in ${wardName} `);
        const bedNumber = bedRes.rows[0].bed_number;
        console.log('Bed:', bedNumber);

        console.log(`Updating Bed ${bedNumber} in ${wardName}...`);

        await pool.query(
            "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name = $2)",
            [bedNumber, wardName]
        );

        console.log('✅ Bed Update Successful.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Update Failed:', err.message);
        process.exit(1);
    }
};

testUpdate();
