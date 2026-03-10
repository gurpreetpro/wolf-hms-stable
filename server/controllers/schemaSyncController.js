/**
 * Cloud Database Full Schema Sync
 * Creates ALL necessary tables for Wolf HMS to function
 */

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const SETUP_KEY = 'WolfSetup2024!';

const fullSchemaSync = async (req, res) => {
    const { setupKey } = req.body;
    
    if (setupKey !== SETUP_KEY) {
        return res.status(403).json({ error: 'Invalid setup key' });
    }
    
    console.log('[SCHEMA SYNC] Starting FULL schema creation...');
    
    try {
        // ======================= CORE TABLES =======================
        console.log('[1/8] Creating Core Tables...');
        
        // Patients
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                age INTEGER,
                gender VARCHAR(20),
                phone VARCHAR(20),
                email VARCHAR(255),
                address TEXT,
                blood_group VARCHAR(10),
                emergency_contact VARCHAR(100),
                medical_history TEXT,
                hospital_id INTEGER REFERENCES hospitals(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // ======================= WARD TABLES =======================
        console.log('[2/8] Creating Ward/IPD Tables...');
        
        // Wards
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wards (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50),
                capacity INTEGER DEFAULT 10,
                hospital_id INTEGER REFERENCES hospitals(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Beds
        await pool.query(`
            CREATE TABLE IF NOT EXISTS beds (
                id SERIAL PRIMARY KEY,
                bed_number VARCHAR(50) NOT NULL,
                ward_id INTEGER REFERENCES wards(id),
                status VARCHAR(20) DEFAULT 'available',
                hospital_id INTEGER REFERENCES hospitals(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Admissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admissions (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id),
                bed_id INTEGER REFERENCES beds(id),
                ward_id INTEGER REFERENCES wards(id),
                admitting_doctor_id INTEGER REFERENCES users(id),
                admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                discharge_date TIMESTAMP,
                status VARCHAR(20) DEFAULT 'admitted',
                diagnosis TEXT,
                notes TEXT,
                news_score INTEGER DEFAULT 0,
                hospital_id INTEGER REFERENCES hospitals(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // ======================= APPOINTMENTS =======================
        console.log('[3/8] Creating Appointment Tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id),
                doctor_id INTEGER REFERENCES users(id),
                date DATE NOT NULL,
                time TIME,
                type VARCHAR(50),
                status VARCHAR(20) DEFAULT 'scheduled',
                notes TEXT,
                hospital_id INTEGER REFERENCES hospitals(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // ======================= OPD =======================
        console.log('[4/8] Creating OPD Tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS opd_queue (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id),
                doctor_id INTEGER REFERENCES users(id),
                token_number INTEGER,
                status VARCHAR(20) DEFAULT 'waiting',
                check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hospital_id INTEGER REFERENCES hospitals(id)
            );
        `);
        
        // ======================= CLINICAL =======================
        console.log('[5/8] Creating Clinical Tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vitals (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER REFERENCES admissions(id),
                patient_id INTEGER REFERENCES patients(id),
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                pulse INTEGER,
                temperature DECIMAL(4,1),
                spo2 INTEGER,
                recorded_by INTEGER REFERENCES users(id),
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hospital_id INTEGER REFERENCES hospitals(id)
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clinical_notes (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER REFERENCES admissions(id),
                patient_id INTEGER REFERENCES patients(id),
                note_type VARCHAR(50),
                content TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hospital_id INTEGER REFERENCES hospitals(id)
            );
        `);
        
        // ======================= BILLING =======================
        console.log('[6/8] Creating Billing Tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id),
                admission_id INTEGER REFERENCES admissions(id),
                total_amount DECIMAL(10,2),
                paid_amount DECIMAL(10,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hospital_id INTEGER REFERENCES hospitals(id)
            );
        `);
        
        // ======================= SEED DEMO DATA =======================
        console.log('[7/8] Seeding Demo Data...');
        
        // Insert default ward
        await pool.query(`
            INSERT INTO wards (name, type, capacity, hospital_id) 
            VALUES ('General Ward', 'General', 20, 1)
            ON CONFLICT DO NOTHING;
        `);
        
        // Insert beds
        await pool.query(`
            INSERT INTO beds (bed_number, ward_id, status, hospital_id)
            SELECT 'BED-' || generate_series, 1, 'available', 1
            FROM generate_series(1, 10)
            ON CONFLICT DO NOTHING;
        `);
        
        // Insert demo patient
        await pool.query(`
            INSERT INTO patients (name, age, gender, phone, hospital_id)
            VALUES 
                ('Demo Patient', 35, 'Male', '9876543210', 1),
                ('Test Patient', 28, 'Female', '9876543211', 1),
                ('Sample Patient', 45, 'Male', '9876543212', 1)
            ON CONFLICT DO NOTHING;
        `);
        
        // ======================= VERIFY =======================
        console.log('[8/8] Verifying Schema...');
        
        const tableCount = await pool.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log(`\n[SCHEMA SYNC] Complete! ${tableCount.rows[0].count} tables now exist.`);
        
        res.json({
            success: true,
            message: 'Full schema sync completed',
            tableCount: parseInt(tableCount.rows[0].count),
            tablesCreated: ['patients', 'wards', 'beds', 'admissions', 'appointments', 'opd_queue', 'vitals', 'clinical_notes', 'invoices']
        });
        
    } catch (error) {
        console.error('[SCHEMA SYNC] Error:', error.message);
        res.status(500).json({ error: error.message, code: error.code });
    }
};

module.exports = { fullSchemaSync };
