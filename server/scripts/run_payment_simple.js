/**
 * WOLF HMS - Payment Phase Migration (Simplified)
 * Run: node server/run_payment_simple.js
 */

const pool = require('./config/db');

const runPaymentPhase = async () => {
    console.log('🏦 WOLF HMS Payment Phase Migration Starting...\n');

    try {
        // PAYMENT TRANSACTIONS
        console.log('📱 Creating Payment Tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER,
                patient_id UUID,
                visit_id INTEGER,
                gateway VARCHAR(50) DEFAULT 'razorpay',
                gateway_order_id VARCHAR(100),
                gateway_payment_id VARCHAR(100),
                gateway_signature VARCHAR(255),
                amount DECIMAL(12,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'INR',
                status VARCHAR(20) DEFAULT 'pending',
                payment_method VARCHAR(50),
                upi_id VARCHAR(100),
                card_last4 VARCHAR(4),
                card_network VARCHAR(50),
                bank_name VARCHAR(100),
                wallet_name VARCHAR(50),
                error_code VARCHAR(50),
                error_description TEXT,
                refund_id VARCHAR(100),
                refund_amount DECIMAL(12,2),
                refund_status VARCHAR(20),
                webhook_received_at TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ payment_transactions');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_qr_codes (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER,
                transaction_id INTEGER,
                qr_data TEXT NOT NULL,
                qr_image_url TEXT,
                amount DECIMAL(12,2),
                upi_link TEXT,
                expires_at TIMESTAMP,
                scanned_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ payment_qr_codes');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_links (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER,
                link_id VARCHAR(100),
                short_url TEXT,
                amount DECIMAL(12,2),
                description TEXT,
                customer_name VARCHAR(200),
                customer_phone VARCHAR(20),
                customer_email VARCHAR(100),
                expires_at TIMESTAMP,
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ payment_links');

        // TPA/INSURANCE TABLES
        console.log('\n🏥 Creating Insurance/TPA Tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS insurance_providers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                short_name VARCHAR(50),
                type VARCHAR(50) DEFAULT 'tpa',
                code VARCHAR(50) UNIQUE,
                logo_url TEXT,
                website VARCHAR(255),
                contact_email VARCHAR(100),
                contact_phone VARCHAR(20),
                toll_free VARCHAR(20),
                address TEXT,
                api_endpoint VARCHAR(255),
                api_key_encrypted TEXT,
                network_hospitals INTEGER DEFAULT 0,
                claims_processed INTEGER DEFAULT 0,
                avg_settlement_days INTEGER,
                approval_rate DECIMAL(5,2),
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ insurance_providers');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_insurance (
                id SERIAL PRIMARY KEY,
                patient_id UUID,
                provider_id INTEGER,
                policy_number VARCHAR(100) NOT NULL,
                policy_type VARCHAR(50),
                company_name VARCHAR(200),
                employee_id VARCHAR(100),
                sum_insured DECIMAL(12,2),
                balance_remaining DECIMAL(12,2),
                deductible DECIMAL(12,2) DEFAULT 0,
                copay_percentage DECIMAL(5,2) DEFAULT 0,
                room_rent_limit DECIMAL(10,2),
                valid_from DATE,
                valid_to DATE,
                member_id VARCHAR(100),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ patient_insurance');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS insurance_claims (
                id SERIAL PRIMARY KEY,
                claim_number VARCHAR(100),
                invoice_id INTEGER,
                patient_insurance_id INTEGER,
                claim_type VARCHAR(30) DEFAULT 'cashless',
                claimed_amount DECIMAL(12,2),
                approved_amount DECIMAL(12,2),
                patient_liability DECIMAL(12,2),
                status VARCHAR(30) DEFAULT 'draft',
                rejection_reason TEXT,
                rejection_code VARCHAR(20),
                settlement_date DATE,
                settlement_amount DECIMAL(12,2),
                utr_number VARCHAR(100),
                documents JSONB DEFAULT '[]',
                submitted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ insurance_claims');

        // AI TRAINING
        console.log('\n🤖 Creating AI Training Tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS denial_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                category VARCHAR(50),
                description TEXT NOT NULL,
                common_cause TEXT,
                prevention_tip TEXT,
                severity VARCHAR(20),
                appealable BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ denial_codes');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS claim_training_data (
                id SERIAL PRIMARY KEY,
                claim_amount DECIMAL(12,2),
                approved_amount DECIMAL(12,2),
                patient_age INTEGER,
                gender VARCHAR(10),
                diagnosis_codes TEXT[],
                procedure_codes TEXT[],
                provider_id INTEGER,
                policy_type VARCHAR(50),
                length_of_stay INTEGER,
                room_type VARCHAR(50),
                preauth_approved BOOLEAN,
                documentation_score DECIMAL(5,2),
                outcome VARCHAR(30),
                denial_code VARCHAR(20),
                processing_days INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ claim_training_data');

        // SEED TOP 5 INDIAN TPAs
        console.log('\n🏢 Seeding Top 5 Indian TPAs...');

        const tpaData = [
            ['Medi Assist Insurance TPA Private Limited', 'Medi Assist', 'tpa', 'MEDIASSIST', 'https://www.mediassist.in', '1800-425-0101', 11000, 6000000, 7, 92.5],
            ['Paramount Health Services & Insurance TPA Private Limited', 'Paramount TPA', 'tpa', 'PARAMOUNT', 'https://www.paramounttpa.com', '1800-103-3003', 8000, 3500000, 8, 90.0],
            ['MDIndia Health Insurance TPA Private Limited', 'MD India', 'tpa', 'MDINDIA', 'https://www.mdindiaonline.com', '1800-209-6116', 10700, 4500000, 9, 88.5],
            ['Raksha Health Insurance TPA Private Limited', 'Raksha TPA', 'tpa', 'RAKSHA', 'https://www.rakshatpa.com', '1800-212-1811', 7500, 3000000, 10, 87.0],
            ['Vidal Health Insurance TPA Private Limited', 'Vidal Health', 'tpa', 'VIDAL', 'https://www.vidalhealthtpa.com', '1800-102-4488', 9000, 4000000, 8, 89.5]
        ];

        for (const tpa of tpaData) {
            await pool.query(`
                INSERT INTO insurance_providers 
                (name, short_name, type, code, website, toll_free, network_hospitals, claims_processed, avg_settlement_days, approval_rate)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (code) DO NOTHING
            `, tpa);
            console.log(`  ✓ ${tpa[1]}`);
        }

        // SEED DENIAL CODES
        console.log('\n📋 Seeding Denial Codes...');

        const denialCodes = [
            ['CO-4', 'coding', 'Missing medical modifier', 'Modifier not added', 'Review modifier requirements', 'medium', true],
            ['CO-11', 'coding', 'Coding error in diagnosis code', 'Incorrect ICD-10 code', 'Use AI-assisted coding', 'high', true],
            ['CO-15', 'authorization', 'Missing or invalid authorization', 'Pre-auth not obtained', 'Verify pre-auth before admission', 'high', true],
            ['CO-16', 'documentation', 'Missing claim information', 'Mandatory fields blank', 'Use form validation', 'medium', true],
            ['CO-18', 'duplicate', 'Duplicate claim submitted', 'Same claim sent twice', 'Check claim status first', 'low', false],
            ['CO-22', 'coordination', 'Coordination of benefits error', 'Wrong primary insurer', 'Verify insurance at registration', 'medium', true],
            ['CO-27', 'eligibility', 'Coverage expired', 'Policy lapse', 'Real-time eligibility check', 'high', false],
            ['CO-29', 'timeline', 'Filing time limit expired', 'Late submission', 'Automated deadline reminders', 'high', false],
            ['CO-50', 'necessity', 'Not medically necessary', 'Insufficient documentation', 'Include detailed clinical notes', 'high', true],
            ['CO-204', 'documentation', 'Missing documentation', 'Records not attached', 'Attach all required documents', 'high', true],
            ['PR-27', 'exclusion', 'Pre-existing condition', 'Condition before policy', 'Verify waiting periods', 'high', true]
        ];

        for (const dc of denialCodes) {
            await pool.query(`
                INSERT INTO denial_codes (code, category, description, common_cause, prevention_tip, severity, appealable)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (code) DO NOTHING
            `, dc);
        }
        console.log(`  ✓ ${denialCodes.length} denial codes seeded`);

        // SEED TRAINING DATA
        console.log('\n📊 Seeding Training Data...');

        await pool.query(`
            INSERT INTO claim_training_data 
            (claim_amount, approved_amount, patient_age, gender, diagnosis_codes, procedure_codes, provider_id, policy_type, length_of_stay, room_type, preauth_approved, documentation_score, outcome, denial_code, processing_days)
            VALUES 
            (50000, 48000, 45, 'M', ARRAY['I10','E11.9'], ARRAY['99213'], 1, 'individual', 3, 'semi-private', true, 95, 'approved', NULL, 5),
            (125000, 120000, 62, 'F', ARRAY['K80.20'], ARRAY['47562'], 2, 'floater', 4, 'private', true, 90, 'approved', NULL, 7),
            (80000, 60000, 55, 'M', ARRAY['I21.0'], ARRAY['92941'], 1, 'group', 5, 'private', true, 75, 'partial', 'CO-45', 12),
            (45000, 0, 35, 'M', ARRAY['Z41.1'], ARRAY['15830'], 2, 'individual', 1, 'daycare', false, 60, 'denied', 'CO-50', 8),
            (75000, 0, 50, 'M', ARRAY['K35.80'], ARRAY['44950'], 5, 'floater', 3, 'semi-private', true, 50, 'denied', 'CO-204', 20),
            (200000, 195000, 58, 'M', ARRAY['I25.10'], ARRAY['33533'], 1, 'individual', 7, 'icu', true, 92, 'approved', NULL, 6)
        `);
        console.log('  ✓ 6 training data records seeded');

        console.log('\n✅ Payment Phase Migration Complete!');
        console.log('\n📋 Summary:');
        console.log('  - Payment tables: 3');
        console.log('  - Insurance/TPA tables: 3');
        console.log('  - AI training tables: 2');
        console.log('  - Top 5 TPAs seeded');
        console.log('  - 11 denial codes seeded');
        console.log('  - 6 training records seeded');

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
};

runPaymentPhase();
