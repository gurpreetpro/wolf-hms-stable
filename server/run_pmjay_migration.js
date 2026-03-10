/**
 * PMJAY Clean Migration
 * Drops existing tables and re-creates everything
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hospital456!@localhost:5432/hospital_db'
});

async function main() {
    console.log('🏥 PMJAY Clean Migration');
    console.log('========================\n');
    
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected\n');
        
        // Drop existing PMJAY tables (reverse dependency order)
        console.log('🗑️  Dropping existing PMJAY tables...');
        await pool.query(`
            DROP TABLE IF EXISTS pmjay_package_usage CASCADE;
            DROP TABLE IF EXISTS pmjay_claims CASCADE;
            DROP TABLE IF EXISTS pmjay_hospital_mappings CASCADE;
            DROP TABLE IF EXISTS pmjay_hospital_empanelment CASCADE;
            DROP TABLE IF EXISTS pmjay_procedures CASCADE;
            DROP TABLE IF EXISTS pmjay_packages CASCADE;
            DROP TABLE IF EXISTS pmjay_specialties CASCADE;
        `);
        console.log('✅ Dropped existing tables\n');
        
        // Create tables one by one
        console.log('📦 Creating PMJAY tables...\n');
        
        // 1. Specialties
        console.log('   1. Creating pmjay_specialties...');
        await pool.query(`
            CREATE TABLE pmjay_specialties (
                id SERIAL PRIMARY KEY,
                code VARCHAR(10) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                procedure_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ pmjay_specialties created');
        
        // 2. Packages
        console.log('   2. Creating pmjay_packages...');
        await pool.query(`
            CREATE TABLE pmjay_packages (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                specialty_code VARCHAR(10) REFERENCES pmjay_specialties(code),
                base_rate DECIMAL(10,2) NOT NULL,
                tier1_rate DECIMAL(10,2),
                tier2_rate DECIMAL(10,2),
                tier3_rate DECIMAL(10,2),
                requires_preauth BOOLEAN DEFAULT FALSE,
                expected_los INTEGER DEFAULT 3,
                implant_cost_range DECIMAL(10,2) DEFAULT 0,
                is_surgical BOOLEAN DEFAULT FALSE,
                is_daycare BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                hbp_version VARCHAR(10) DEFAULT '2.2',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ pmjay_packages created');
        
        // 3. Procedures
        console.log('   3. Creating pmjay_procedures...');
        await pool.query(`
            CREATE TABLE pmjay_procedures (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                package_code VARCHAR(20) REFERENCES pmjay_packages(code),
                specialty_code VARCHAR(10) REFERENCES pmjay_specialties(code),
                rate DECIMAL(10,2) NOT NULL,
                implant_cost DECIMAL(10,2) DEFAULT 0,
                requires_preauth BOOLEAN DEFAULT FALSE,
                ichi_code VARCHAR(50),
                icd_codes TEXT[],
                cpt_codes TEXT[],
                includes_meds BOOLEAN DEFAULT TRUE,
                includes_consumables BOOLEAN DEFAULT TRUE,
                includes_diagnostics BOOLEAN DEFAULT TRUE,
                pre_hospitalization_days INTEGER DEFAULT 3,
                post_hospitalization_days INTEGER DEFAULT 15,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ pmjay_procedures created');
        
        // 4. Hospital Empanelment
        console.log('   4. Creating pmjay_hospital_empanelment...');
        await pool.query(`
            CREATE TABLE pmjay_hospital_empanelment (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                pmjay_hospital_id VARCHAR(50),
                empanelment_status VARCHAR(20) DEFAULT 'PENDING',
                city_tier VARCHAR(10) DEFAULT 'T2',
                state_code VARCHAR(10),
                district_code VARCHAR(10),
                specialties_enabled TEXT[],
                max_bed_capacity INTEGER,
                pmjay_contact_email VARCHAR(255),
                pmjay_contact_phone VARCHAR(20),
                last_sync_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(hospital_id)
            )
        `);
        console.log('   ✅ pmjay_hospital_empanelment created');
        
        // 5. Hospital Mappings
        console.log('   5. Creating pmjay_hospital_mappings...');
        await pool.query(`
            CREATE TABLE pmjay_hospital_mappings (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                pmjay_procedure_code VARCHAR(20) REFERENCES pmjay_procedures(code),
                hospital_procedure_id INTEGER,
                hospital_procedure_name VARCHAR(255),
                hospital_rate DECIMAL(10,2),
                is_enabled BOOLEAN DEFAULT TRUE,
                requires_approval BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(hospital_id, pmjay_procedure_code)
            )
        `);
        console.log('   ✅ pmjay_hospital_mappings created');
        
        // 6. Claims
        console.log('   6. Creating pmjay_claims...');
        await pool.query(`
            CREATE TABLE pmjay_claims (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                admission_id INTEGER REFERENCES admissions(id),
                patient_id UUID,
                beneficiary_id VARCHAR(50),
                family_id VARCHAR(50),
                preauth_id VARCHAR(50),
                claim_id VARCHAR(50),
                package_code VARCHAR(20),
                package_name VARCHAR(255),
                procedure_codes TEXT[],
                package_rate DECIMAL(10,2),
                implant_cost DECIMAL(10,2) DEFAULT 0,
                claimed_amount DECIMAL(10,2),
                approved_amount DECIMAL(10,2),
                status VARCHAR(20) DEFAULT 'DRAFT',
                preauth_status VARCHAR(20),
                preauth_submitted_at TIMESTAMP,
                preauth_approved_at TIMESTAMP,
                claim_submitted_at TIMESTAMP,
                claim_approved_at TIMESTAMP,
                documents JSONB DEFAULT '[]',
                rejection_reason TEXT,
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ pmjay_claims created');
        
        // 7. Package Usage
        console.log('   7. Creating pmjay_package_usage...');
        await pool.query(`
            CREATE TABLE pmjay_package_usage (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                admission_id INTEGER REFERENCES admissions(id),
                claim_id INTEGER REFERENCES pmjay_claims(id),
                item_type VARCHAR(50) NOT NULL,
                item_id INTEGER,
                item_name VARCHAR(255) NOT NULL,
                item_code VARCHAR(50),
                quantity DECIMAL(10,2) DEFAULT 1,
                unit_cost DECIMAL(10,2) NOT NULL,
                total_cost DECIMAL(10,2) NOT NULL,
                would_have_billed BOOLEAN DEFAULT TRUE,
                covered_by_package BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ pmjay_package_usage created');
        
        // Create indexes
        console.log('\n📇 Creating indexes...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_pmjay_packages_specialty ON pmjay_packages(specialty_code);
            CREATE INDEX IF NOT EXISTS idx_pmjay_procedures_specialty ON pmjay_procedures(specialty_code);
            CREATE INDEX IF NOT EXISTS idx_pmjay_procedures_package ON pmjay_procedures(package_code);
            CREATE INDEX IF NOT EXISTS idx_pmjay_empanelment_hospital ON pmjay_hospital_empanelment(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_pmjay_mappings_hospital ON pmjay_hospital_mappings(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_pmjay_claims_hospital ON pmjay_claims(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_pmjay_claims_status ON pmjay_claims(status);
            CREATE INDEX IF NOT EXISTS idx_pmjay_usage_hospital ON pmjay_package_usage(hospital_id);
        `);
        console.log('✅ Indexes created');
        
        // Add admission columns
        console.log('\n📊 Adding PMJAY columns to admissions...');
        const admissionColumns = [
            ['payment_mode', "VARCHAR(20) DEFAULT 'SELF_PAY'"],
            ['pmjay_beneficiary_id', 'VARCHAR(50)'],
            ['pmjay_package_code', 'VARCHAR(20)'],
            ['pmjay_package_rate', 'DECIMAL(10,2)'],
            ['pmjay_preauth_id', 'VARCHAR(50)'],
            ['pmjay_preauth_status', 'VARCHAR(20)'],
            ['pmjay_claim_id', 'VARCHAR(50)']
        ];
        
        for (const [col, type] of admissionColumns) {
            const exists = await pool.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'admissions' AND column_name = $1
            `, [col]);
            if (exists.rows.length === 0) {
                await pool.query(`ALTER TABLE admissions ADD COLUMN ${col} ${type}`);
                console.log(`   + admissions.${col}`);
            }
        }
        
        // Add patient columns
        console.log('\n📊 Adding PMJAY columns to patients...');
        const patientColumns = [
            ['pmjay_id', 'VARCHAR(50)'],
            ['pmjay_family_id', 'VARCHAR(50)'],
            ['pmjay_verified', 'BOOLEAN DEFAULT FALSE'],
            ['pmjay_verified_at', 'TIMESTAMP']
        ];
        
        for (const [col, type] of patientColumns) {
            const exists = await pool.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = $1
            `, [col]);
            if (exists.rows.length === 0) {
                await pool.query(`ALTER TABLE patients ADD COLUMN ${col} ${type}`);
                console.log(`   + patients.${col}`);
            }
        }
        
        // Enable RLS
        console.log('\n🔒 Enabling Row Level Security...');
        await pool.query(`
            ALTER TABLE pmjay_hospital_empanelment ENABLE ROW LEVEL SECURITY;
            ALTER TABLE pmjay_hospital_mappings ENABLE ROW LEVEL SECURITY;
            ALTER TABLE pmjay_claims ENABLE ROW LEVEL SECURITY;
            ALTER TABLE pmjay_package_usage ENABLE ROW LEVEL SECURITY;
        `);
        console.log('✅ RLS enabled');
        
        // Seed specialties
        console.log('\n🌱 Seeding specialties...');
        await pool.query(`
            INSERT INTO pmjay_specialties (code, name, procedure_count) VALUES
            ('MG', 'General Medicine', 150),
            ('MC', 'Cardiology', 45),
            ('NE', 'Nephrology', 25),
            ('OP', 'Ophthalmology', 40),
            ('OG', 'Obstetrics & Gynaecology', 85),
            ('GS', 'General Surgery', 120),
            ('OR', 'Orthopedics', 90),
            ('UR', 'Urology', 55),
            ('NS', 'Neurosurgery', 60),
            ('CT', 'Cardiothoracic Surgery', 35),
            ('PE', 'Pediatric Medical', 45),
            ('PS', 'Pediatric Surgery', 40),
            ('EN', 'ENT', 50),
            ('DE', 'Dermatology', 20),
            ('PM', 'Plastic Surgery', 30),
            ('ON', 'Oncology', 75),
            ('BU', 'Burns', 25),
            ('EM', 'Emergency Medicine', 30),
            ('PU', 'Pulmonology', 35),
            ('GE', 'Gastroenterology', 40),
            ('RH', 'Rheumatology', 15),
            ('NR', 'Neurology', 30),
            ('IC', 'Intensive Care', 10)
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        `);
        
        // Seed sample packages
        console.log('🌱 Seeding sample packages...');
        await pool.query(`
            INSERT INTO pmjay_packages (code, name, specialty_code, base_rate, tier1_rate, tier2_rate, requires_preauth, expected_los, is_surgical, is_daycare) VALUES
            ('MG001', 'Acute Febrile Illness', 'MG', 1800, 2000, 1600, FALSE, 3, FALSE, FALSE),
            ('MG008', 'Pneumonia - Community Acquired', 'MG', 4000, 4500, 3500, FALSE, 5, FALSE, FALSE),
            ('NE001', 'Haemodialysis (per session)', 'NE', 2000, 2200, 1800, FALSE, 1, FALSE, TRUE),
            ('OP001', 'Cataract Surgery - SICS', 'OP', 10000, 11000, 9000, FALSE, 1, TRUE, TRUE),
            ('OP002', 'Cataract Surgery - Phaco with IOL', 'OP', 15000, 17000, 13000, FALSE, 1, TRUE, TRUE),
            ('OG001', 'Normal Delivery', 'OG', 9000, 10000, 8000, FALSE, 3, FALSE, FALSE),
            ('OG003', 'Caesarean Section - LSCS', 'OG', 12000, 14000, 10000, FALSE, 5, TRUE, FALSE),
            ('GS001', 'Appendicectomy - Open', 'GS', 17000, 19000, 15000, FALSE, 4, TRUE, FALSE),
            ('GS002', 'Appendicectomy - Laparoscopic', 'GS', 25000, 28000, 22000, FALSE, 3, TRUE, FALSE),
            ('GS004', 'Cholecystectomy - Laparoscopic', 'GS', 25000, 28000, 22000, FALSE, 3, TRUE, FALSE),
            ('GS005', 'Inguinal Hernia - Open', 'GS', 12000, 14000, 10000, FALSE, 3, TRUE, FALSE),
            ('MC001', 'Coronary Angiography', 'MC', 12000, 14000, 10000, FALSE, 2, TRUE, FALSE),
            ('MC002', 'PTCA - Single Stent (BMS)', 'MC', 45000, 50000, 40000, TRUE, 3, TRUE, FALSE),
            ('MC007', 'CABG - Off Pump', 'MC', 120000, 140000, 100000, TRUE, 10, TRUE, FALSE),
            ('OR001', 'Fracture Femur - IM Nail', 'OR', 30000, 35000, 25000, TRUE, 7, TRUE, FALSE),
            ('OR009', 'Total Knee Replacement', 'OR', 80000, 90000, 70000, TRUE, 10, TRUE, FALSE)
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, base_rate = EXCLUDED.base_rate
        `);
        
        // Seed sample procedures
        console.log('🌱 Seeding sample procedures...');
        await pool.query(`
            INSERT INTO pmjay_procedures (code, name, package_code, specialty_code, rate, requires_preauth) VALUES
            ('MG001A', 'Acute Febrile Illness Treatment', 'MG001', 'MG', 1800, FALSE),
            ('MG008A', 'Community Pneumonia Treatment', 'MG008', 'MG', 4000, FALSE),
            ('NE001A', 'Haemodialysis Session', 'NE001', 'NE', 2000, FALSE),
            ('OP001A', 'Cataract SICS with IOL', 'OP001', 'OP', 10000, FALSE),
            ('OP002A', 'Phaco with Foldable IOL', 'OP002', 'OP', 15000, FALSE),
            ('OG001A', 'Normal Vaginal Delivery', 'OG001', 'OG', 9000, FALSE),
            ('OG003A', 'LSCS', 'OG003', 'OG', 12000, FALSE),
            ('GS001A', 'Open Appendicectomy', 'GS001', 'GS', 17000, FALSE),
            ('GS002A', 'Laparoscopic Appendicectomy', 'GS002', 'GS', 25000, FALSE),
            ('GS004A', 'Lap Cholecystectomy', 'GS004', 'GS', 25000, FALSE),
            ('MC001A', 'Diagnostic Coronary Angio', 'MC001', 'MC', 12000, FALSE),
            ('MC002A', 'PTCA with BMS Stent', 'MC002', 'MC', 45000, TRUE),
            ('MC007A', 'CABG Off Pump', 'MC007', 'MC', 120000, TRUE),
            ('OR001A', 'IM Nailing Femur', 'OR001', 'OR', 30000, TRUE),
            ('OR009A', 'TKR Unilateral', 'OR009', 'OR', 80000, TRUE)
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rate = EXCLUDED.rate
        `);
        
        // Show stats
        console.log('\n📊 Final counts:');
        const specs = await pool.query('SELECT COUNT(*) FROM pmjay_specialties');
        const pkgs = await pool.query('SELECT COUNT(*) FROM pmjay_packages');
        const procs = await pool.query('SELECT COUNT(*) FROM pmjay_procedures');
        console.log(`   - Specialties: ${specs.rows[0].count}`);
        console.log(`   - Packages: ${pkgs.rows[0].count}`);
        console.log(`   - Procedures: ${procs.rows[0].count}`);
        
        console.log('\n✅ PMJAY Migration Complete!');
        console.log('========================\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
