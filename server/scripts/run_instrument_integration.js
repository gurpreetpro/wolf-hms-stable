/**
 * Phase 1: Lab Instrument Integration - Database Migration
 * Creates tables for instrument registry, drivers, and communication logging
 * Run: node server/run_instrument_integration.js
 */

const pool = require('./config/db');

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔌 Starting Lab Instrument Integration Migration...\n');

        await client.query('BEGIN');

        // 1. Create lab_instruments table
        console.log('📦 Creating lab_instruments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_instruments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                manufacturer VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                category VARCHAR(50) CHECK (category IN ('biochemistry', 'hematology', 'immunoassay', 'coagulation', 'urinalysis', 'blood_gas', 'other')),
                connection_type VARCHAR(20) CHECK (connection_type IN ('RS232', 'TCP_IP', 'USB')),
                connection_config JSONB DEFAULT '{}',
                protocol VARCHAR(30) CHECK (protocol IN ('ASTM_E1381', 'ASTM_E1394', 'HL7_V2', 'HL7_FHIR', 'PROPRIETARY')),
                driver_id INT,
                is_active BOOLEAN DEFAULT true,
                is_bidirectional BOOLEAN DEFAULT true,
                last_communication TIMESTAMP,
                last_error TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 2. Create instrument_drivers table (pre-built driver configs)
        console.log('📦 Creating instrument_drivers table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS instrument_drivers (
                id SERIAL PRIMARY KEY,
                manufacturer VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                category VARCHAR(50),
                protocol VARCHAR(30),
                connection_defaults JSONB DEFAULT '{}',
                parser_config JSONB DEFAULT '{}',
                field_mappings JSONB DEFAULT '{}',
                sample_message TEXT,
                notes TEXT,
                verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 3. Create instrument_comm_log table
        console.log('📦 Creating instrument_comm_log table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS instrument_comm_log (
                id SERIAL PRIMARY KEY,
                instrument_id INT REFERENCES lab_instruments(id) ON DELETE CASCADE,
                direction VARCHAR(10) CHECK (direction IN ('IN', 'OUT')),
                message_type VARCHAR(50),
                raw_message TEXT,
                parsed_data JSONB,
                status VARCHAR(30) CHECK (status IN ('SUCCESS', 'PARSE_ERROR', 'TIMEOUT', 'CONNECTION_ERROR', 'ACK_SENT', 'NAK_SENT')),
                error_details TEXT,
                processing_time_ms INT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 4. Create index for faster lookups
        console.log('📦 Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_instrument_comm_log_instrument 
            ON instrument_comm_log(instrument_id, created_at DESC)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_instruments_active 
            ON lab_instruments(is_active) WHERE is_active = true
        `);

        // 5. Add foreign key for driver_id
        await client.query(`
            ALTER TABLE lab_instruments 
            ADD CONSTRAINT fk_instrument_driver 
            FOREIGN KEY (driver_id) REFERENCES instrument_drivers(id) 
            ON DELETE SET NULL
        `).catch(() => console.log('   (driver FK already exists)'));

        // 6. Seed Erba instrument drivers
        console.log('\n🇮🇳 Seeding Erba/Transasia drivers...');
        await client.query(`
            INSERT INTO instrument_drivers (manufacturer, model, category, protocol, connection_defaults, parser_config, field_mappings, sample_message, notes, verified)
            VALUES 
            -- Erba EM 200
            ('Transasia/Erba', 'EM 200', 'biochemistry', 'ASTM_E1394', 
             '{"baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.3", "testCode": "R.2.4", "result": "R.3.2", "unit": "R.4.1", "refRange": "R.5", "flag": "R.6.1"}',
             'H|\\^&|||Host^Name|||||||P|1|\\rP|1||||Smith^John||19850215|M|||\\rO|1|SID001||^^^GLU\\r',
             'Compact biochemistry analyzer, 200-400 T/H with ISE. Popular in small-medium labs.',
             true),
            
            -- Erba XL 640
            ('Transasia/Erba', 'XL 640', 'biochemistry', 'ASTM_E1394',
             '{"baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.3", "testCode": "R.2.4", "result": "R.3.2", "unit": "R.4.1", "refRange": "R.5", "flag": "R.6.1"}',
             'H|\\^&|||Host^Name|||||||P|1|\\rP|1||||Doe^Jane||19900510|F|||\\rO|1|SID002||^^^LFT\\r',
             'High-throughput biochemistry analyzer, 400-640 T/H. Medium-large labs. IoT enabled.',
             true),
             
            -- Erba H 560
            ('Transasia/Erba', 'H 560', 'hematology', 'ASTM_E1394',
             '{"baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.3", "wbc": "R.3.2", "rbc": "R.3.2", "hgb": "R.3.2", "hct": "R.3.2", "plt": "R.3.2"}',
             'H|\\^&|||Erba H560|||||||P|1|\\rP|1||||Patient^Name||DOB|M|||\\rR|1|^^^WBC|8.5|10^3/uL|||N||F\\r',
             '5-part differential hematology analyzer. 60 S/H. Fastest growing in India.',
             true)
            ON CONFLICT DO NOTHING
        `);

        // 7. Seed Sysmex instrument drivers
        console.log('🇯🇵 Seeding Sysmex drivers...');
        await client.query(`
            INSERT INTO instrument_drivers (manufacturer, model, category, protocol, connection_defaults, parser_config, field_mappings, sample_message, notes, verified)
            VALUES 
            -- Sysmex XQ-320
            ('Sysmex', 'XQ-320', 'hematology', 'ASTM_E1394',
             '{"baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.2", "wbc": "R.3.2", "rbc": "R.3.2", "hgb": "R.3.2", "hct": "R.3.2", "mcv": "R.3.2", "mch": "R.3.2", "mchc": "R.3.2", "plt": "R.3.2"}',
             'H|\\^&|||Sysmex XQ-320|||||||P|1|20250101120000\\rP|1||||Patient^Test||19900101|M|||\\rO|1|12345||^^^CBC\\rR|1|^^^WBC|7.2|10^3/uL|4.0-10.0||N||F\\r',
             '3-part differential, compact, high-performance. Made in India. 60 S/H.',
             true),
            
            -- Sysmex XN-550
            ('Sysmex', 'XN-550', 'hematology', 'ASTM_E1394',
             '{"port": 5000, "host": "localhost"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.2", "wbc": "R.3.2", "rbc": "R.3.2", "hgb": "R.3.2", "hct": "R.3.2", "mcv": "R.3.2", "mch": "R.3.2", "mchc": "R.3.2", "plt": "R.3.2", "neut": "R.3.2", "lymph": "R.3.2", "mono": "R.3.2", "eos": "R.3.2", "baso": "R.3.2"}',
             'H|\\^&|||Sysmex XN-550|||||||P|1|20250101120000\\rP|1||||Patient^Test||19900101|F|||\\rO|1|67890||^^^CBC+DIFF\\rR|1|^^^WBC|6.8|10^3/uL|4.0-10.0||N||F\\rR|2|^^^NEUT%|58.2|%|40-70||N||F\\r',
             '6-part differential with advanced flags. 100 S/H. TCP/IP preferred.',
             true)
            ON CONFLICT DO NOTHING
        `);

        // 8. Seed Mindray drivers (bonus)
        console.log('🇨🇳 Seeding Mindray drivers (bonus)...');
        await client.query(`
            INSERT INTO instrument_drivers (manufacturer, model, category, protocol, connection_defaults, parser_config, field_mappings, notes, verified)
            VALUES 
            ('Mindray', 'BS-480', 'biochemistry', 'ASTM_E1394',
             '{"baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.3", "testCode": "R.2.4", "result": "R.3.2", "unit": "R.4.1"}',
             'Value biochemistry analyzer, 400 T/H. Popular in mid-sized labs.',
             true),
            ('Mindray', 'BC-6200', 'hematology', 'ASTM_E1394',
             '{"baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none"}',
             '{"messageDelimiter": "\\r", "fieldDelimiter": "|", "repeatDelimiter": "\\\\", "componentDelimiter": "^", "escapeDelimiter": "&"}',
             '{"patientId": "P.3", "sampleId": "O.2", "wbc": "R.3.2", "rbc": "R.3.2", "hgb": "R.3.2", "plt": "R.3.2"}',
             '5-part differential, 100 S/H. High throughput, low reagent cost.',
             true)
            ON CONFLICT DO NOTHING
        `);

        await client.query('COMMIT');

        // Summary
        const instrumentCount = await client.query('SELECT COUNT(*) FROM instrument_drivers');
        console.log(`\n✅ Migration completed successfully!`);
        console.log(`📊 Seeded ${instrumentCount.rows[0].count} instrument drivers`);
        console.log(`\nTables created:`);
        console.log(`   - lab_instruments (instrument registry)`);
        console.log(`   - instrument_drivers (pre-built driver configs)`);
        console.log(`   - instrument_comm_log (communication log)`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    runMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runMigration };
