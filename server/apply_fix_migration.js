/**
 * Apply fix migration for UUID/INT type mismatches - Step by Step
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: process.env.DB_PORT || 5432,
});

async function run(name, sql) {
    try {
        await pool.query(sql);
        console.log(`✅ ${name}`);
        return true;
    } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
            console.log(`⚠️  ${name} (already exists)`);
            return true;
        }
        console.log(`❌ ${name}: ${e.message.substring(0, 60)}`);
        return false;
    }
}

async function main() {
    console.log('═'.repeat(50));
    console.log('🔧 Applying Fix Migration 330 (Step by Step)');
    console.log('═'.repeat(50));
    
    // 1. Soft delete columns
    await run('patients.deleted_at', `ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await run('patients.deleted_by', `ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_by INT`);
    await run('patients.deletion_reason', `ALTER TABLE patients ADD COLUMN IF NOT EXISTS deletion_reason TEXT`);
    
    await run('admissions.deleted_at', `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await run('admissions.deleted_by', `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_by INT`);
    await run('admissions.deletion_reason', `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deletion_reason TEXT`);
    
    // 2. Patient history (UUID patient_id)
    await run('patient_history table', `
        CREATE TABLE IF NOT EXISTS patient_history (
            id SERIAL PRIMARY KEY,
            patient_id UUID,
            hospital_id INT,
            changed_by INT,
            changed_at TIMESTAMP DEFAULT NOW(),
            action VARCHAR(20),
            before_data JSONB,
            after_data JSONB,
            reason TEXT,
            ip_address VARCHAR(45)
        )
    `);
    
    // 3. Admin audit log
    await run('admin_audit_log table', `
        CREATE TABLE IF NOT EXISTS admin_audit_log (
            id SERIAL PRIMARY KEY,
            hospital_id INT,
            user_id INT,
            username VARCHAR(255),
            role VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT,
            entity_name VARCHAR(255),
            before_data JSONB,
            after_data JSONB,
            reason TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 4. Doctor Reviews (UUID patient_id)
    await run('doctor_reviews table', `
        CREATE TABLE IF NOT EXISTS doctor_reviews (
            id SERIAL PRIMARY KEY,
            doctor_id INTEGER NOT NULL,
            patient_id UUID,
            appointment_id INTEGER,
            rating INTEGER NOT NULL,
            title VARCHAR(200),
            comment TEXT,
            tags TEXT[] DEFAULT '{}',
            is_anonymous BOOLEAN DEFAULT false,
            helpful_count INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 5. Review helpful
    await run('review_helpful table', `
        CREATE TABLE IF NOT EXISTS review_helpful (
            id SERIAL PRIMARY KEY,
            review_id INTEGER,
            patient_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 6. Family members (UUID patient_id)
    await run('family_members table', `
        CREATE TABLE IF NOT EXISTS family_members (
            id SERIAL PRIMARY KEY,
            primary_patient_id UUID NOT NULL,
            relationship VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            email VARCHAR(255),
            date_of_birth DATE,
            gender VARCHAR(10),
            blood_group VARCHAR(10),
            is_emergency_contact BOOLEAN DEFAULT false,
            is_dependent BOOLEAN DEFAULT false,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 7. Chat threads (UUID patient_id)
    await run('chat_threads table', `
        CREATE TABLE IF NOT EXISTS chat_threads (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            doctor_id INTEGER NOT NULL,
            subject VARCHAR(255),
            status VARCHAR(20) DEFAULT 'open',
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 8. Chat messages
    await run('chat_messages table', `
        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            thread_id INTEGER,
            sender_type VARCHAR(10) NOT NULL,
            sender_id UUID,
            user_id INTEGER,
            message TEXT NOT NULL,
            attachments JSONB DEFAULT '[]',
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 9. Article bookmarks (UUID patient_id)
    await run('article_bookmarks table', `
        CREATE TABLE IF NOT EXISTS article_bookmarks (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            article_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 10. Sample journey (UUID patient_id)
    await run('sample_journey table', `
        CREATE TABLE IF NOT EXISTS sample_journey (
            id SERIAL PRIMARY KEY,
            lab_request_id INTEGER,
            patient_id UUID NOT NULL,
            status VARCHAR(50) DEFAULT 'scheduled',
            scheduled_date DATE,
            scheduled_time TIME,
            collection_address JSONB,
            collector_id INTEGER,
            collected_at TIMESTAMP,
            received_at TIMESTAMP,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 11. Data retention policy
    await run('data_retention_policy table', `
        CREATE TABLE IF NOT EXISTS data_retention_policy (
            id SERIAL PRIMARY KEY,
            hospital_id INT,
            entity_type VARCHAR(50) NOT NULL,
            retention_years INT DEFAULT 5,
            medico_legal_retention_years INT DEFAULT 10,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // 12. Billing settings (seed data)
    console.log('\n📋 Seeding billing settings...');
    try {
        const hospitals = await pool.query('SELECT id FROM hospitals');
        for (const h of hospitals.rows) {
            const settings = ['bank_name', 'bank_account', 'bank_ifsc', 'default_registration_fee', 'default_consultation_fee', 'gst_mode', 'default_gst_rate'];
            for (const key of settings) {
                try {
                    await pool.query(
                        `INSERT INTO hospital_settings (key, value, hospital_id, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
                        [key, key.includes('fee') || key === 'default_gst_rate' ? '0' : '', h.id]
                    );
                } catch (e) { /* ignore */ }
            }
        }
        console.log('✅ Billing settings seeded');
    } catch (e) {
        console.log('⚠️  Billing settings:', e.message.substring(0, 50));
    }
    
    console.log('\n═'.repeat(50));
    console.log('🎉 Fix Migration 330 Complete!');
    console.log('═'.repeat(50));
    
    await pool.end();
}

main();
