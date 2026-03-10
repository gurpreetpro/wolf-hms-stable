/**
 * WOLF HMS - Phase Payment Migration
 * Payment Gateway + Insurance/TPA + AI Training Data
 * Run: node server/run_payment_phase.js
 */

const pool = require('./config/db');

const runPaymentPhase = async () => {
    console.log('🏦 WOLF HMS Payment Phase Migration Starting...\n');

    try {
        // ==========================================
        // PHASE 1: PAYMENT GATEWAY TABLES
        // ==========================================
        console.log('📱 Phase 1: Creating Payment Gateway Tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id),
                patient_id UUID REFERENCES patients(patient_id),
                visit_id INTEGER,
                gateway VARCHAR(50) NOT NULL DEFAULT 'razorpay',
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_qr_codes (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id),
                transaction_id INTEGER REFERENCES payment_transactions(id),
                qr_data TEXT NOT NULL,
                qr_image_url TEXT,
                amount DECIMAL(12,2),
                upi_link TEXT,
                expires_at TIMESTAMP,
                scanned_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_links (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id),
                link_id VARCHAR(100) UNIQUE,
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

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_trans_invoice ON payment_transactions(invoice_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_trans_patient ON payment_transactions(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON payment_transactions(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_trans_gateway_order ON payment_transactions(gateway_order_id)`);
        console.log('  ✓ Payment transaction tables created');

        // ==========================================
        // PHASE 2: INSURANCE/TPA TABLES
        // ==========================================
        console.log('\n🏥 Phase 2: Creating Insurance/TPA Tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS insurance_providers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                short_name VARCHAR(50),
                type VARCHAR(50) NOT NULL DEFAULT 'tpa',
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_insurance (
                id SERIAL PRIMARY KEY,
                patient_id UUID REFERENCES patients(patient_id),
                provider_id INTEGER REFERENCES insurance_providers(id),
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
                relation_to_primary VARCHAR(50),
                primary_holder_name VARCHAR(200),
                is_primary BOOLEAN DEFAULT true,
                verified_at TIMESTAMP,
                verification_response JSONB,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS preauth_requests (
                id SERIAL PRIMARY KEY,
                preauth_number VARCHAR(100) UNIQUE,
                admission_id INTEGER REFERENCES admissions(id),
                patient_insurance_id INTEGER REFERENCES patient_insurance(id),
                requested_amount DECIMAL(12,2) NOT NULL,
                approved_amount DECIMAL(12,2),
                status VARCHAR(30) DEFAULT 'pending',
                diagnosis_codes TEXT[],
                procedure_codes TEXT[],
                primary_diagnosis TEXT,
                treatment_type VARCHAR(100),
                expected_los INTEGER,
                room_type VARCHAR(50),
                documents JSONB DEFAULT '[]',
                tpa_response JSONB,
                queries JSONB DEFAULT '[]',
                requested_by INTEGER REFERENCES users(id),
                requested_at TIMESTAMP DEFAULT NOW(),
                responded_at TIMESTAMP,
                expires_at TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS insurance_claims (
                id SERIAL PRIMARY KEY,
                claim_number VARCHAR(100) UNIQUE,
                invoice_id INTEGER REFERENCES invoices(id),
                preauth_id INTEGER REFERENCES preauth_requests(id),
                patient_insurance_id INTEGER REFERENCES patient_insurance(id),
                claim_type VARCHAR(30) DEFAULT 'cashless',
                claimed_amount DECIMAL(12,2) NOT NULL,
                approved_amount DECIMAL(12,2),
                deduction_amount DECIMAL(12,2) DEFAULT 0,
                patient_liability DECIMAL(12,2),
                status VARCHAR(30) DEFAULT 'draft',
                rejection_reason TEXT,
                rejection_code VARCHAR(20),
                settlement_date DATE,
                settlement_amount DECIMAL(12,2),
                utr_number VARCHAR(100),
                documents JSONB DEFAULT '[]',
                submitted_at TIMESTAMP,
                last_followup_at TIMESTAMP,
                followup_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS claim_followups (
                id SERIAL PRIMARY KEY,
                claim_id INTEGER REFERENCES insurance_claims(id),
                action_type VARCHAR(50),
                action_by INTEGER REFERENCES users(id),
                contact_person VARCHAR(200),
                notes TEXT,
                response TEXT,
                next_action_date DATE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON patient_insurance(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_patient_insurance_provider ON patient_insurance(provider_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_preauth_admission ON preauth_requests(admission_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_preauth_status ON preauth_requests(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_claims_invoice ON insurance_claims(invoice_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status)`);

        console.log('  ✓ Insurance/TPA tables created');

        // ==========================================
        // AI TRAINING DATA TABLES
        // ==========================================
        console.log('\n🤖 Creating AI Training Data Tables...');

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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ai_billing_predictions (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER,
                claim_id INTEGER,
                model_name VARCHAR(50) NOT NULL,
                model_version VARCHAR(20),
                prediction_type VARCHAR(50),
                prediction_result JSONB NOT NULL,
                confidence_score DECIMAL(5,4),
                features_used JSONB,
                actual_outcome VARCHAR(50),
                human_feedback VARCHAR(20),
                feedback_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS icd_code_suggestions (
                id SERIAL PRIMARY KEY,
                consultation_id INTEGER,
                admission_id INTEGER,
                diagnosis_text TEXT NOT NULL,
                suggested_codes JSONB,
                selected_codes TEXT[],
                reviewed_by INTEGER,
                review_time_ms INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

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
        console.log('  ✓ AI training data tables created');

        // ==========================================
        // SEED TOP 5 INDIAN TPAs
        // ==========================================
        console.log('\n🏢 Seeding Top 5 Indian TPAs...');

        const tpaData = [
            {
                name: 'Medi Assist Insurance TPA Private Limited',
                short_name: 'Medi Assist',
                type: 'tpa',
                code: 'MEDIASSIST',
                website: 'https://www.mediassist.in',
                toll_free: '1800-425-0101',
                network_hospitals: 11000,
                claims_processed: 6000000,
                avg_settlement_days: 7,
                approval_rate: 92.5
            },
            {
                name: 'Paramount Health Services & Insurance TPA Private Limited',
                short_name: 'Paramount TPA',
                type: 'tpa',
                code: 'PARAMOUNT',
                website: 'https://www.paramounttpa.com',
                toll_free: '1800-103-3003',
                network_hospitals: 8000,
                claims_processed: 3500000,
                avg_settlement_days: 8,
                approval_rate: 90.0
            },
            {
                name: 'MDIndia Health Insurance TPA Private Limited',
                short_name: 'MD India',
                type: 'tpa',
                code: 'MDINDIA',
                website: 'https://www.mdindiaonline.com',
                toll_free: '1800-209-6116',
                network_hospitals: 10700,
                claims_processed: 4500000,
                avg_settlement_days: 9,
                approval_rate: 88.5
            },
            {
                name: 'Raksha Health Insurance TPA Private Limited',
                short_name: 'Raksha TPA',
                type: 'tpa',
                code: 'RAKSHA',
                website: 'https://www.rakshatpa.com',
                toll_free: '1800-212-1811',
                network_hospitals: 7500,
                claims_processed: 3000000,
                avg_settlement_days: 10,
                approval_rate: 87.0
            },
            {
                name: 'Vidal Health Insurance TPA Private Limited',
                short_name: 'Vidal Health',
                type: 'tpa',
                code: 'VIDAL',
                website: 'https://www.vidalhealthtpa.com',
                toll_free: '1800-102-4488',
                network_hospitals: 9000,
                claims_processed: 4000000,
                avg_settlement_days: 8,
                approval_rate: 89.5
            }
        ];

        for (const tpa of tpaData) {
            await pool.query(`
                INSERT INTO insurance_providers 
                (name, short_name, type, code, website, toll_free, network_hospitals, claims_processed, avg_settlement_days, approval_rate)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    network_hospitals = EXCLUDED.network_hospitals,
                    claims_processed = EXCLUDED.claims_processed,
                    avg_settlement_days = EXCLUDED.avg_settlement_days,
                    approval_rate = EXCLUDED.approval_rate
            `, [tpa.name, tpa.short_name, tpa.type, tpa.code, tpa.website, tpa.toll_free,
            tpa.network_hospitals, tpa.claims_processed, tpa.avg_settlement_days, tpa.approval_rate]);
            console.log(`  ✓ ${tpa.short_name} added`);
        }

        // ==========================================
        // SEED DENIAL CODES FOR AI TRAINING
        // ==========================================
        console.log('\n📋 Seeding Common Denial Codes...');

        const denialCodes = [
            { code: 'CO-4', category: 'coding', description: 'Missing medical modifier', common_cause: 'Modifier not added to procedure code', prevention_tip: 'Review modifier requirements before submission', severity: 'medium', appealable: true },
            { code: 'CO-11', category: 'coding', description: 'Coding error in diagnosis code', common_cause: 'Incorrect ICD-10 code selected', prevention_tip: 'Use AI-assisted coding suggestions', severity: 'high', appealable: true },
            { code: 'CO-15', category: 'authorization', description: 'Missing or invalid authorization number', common_cause: 'Pre-auth not obtained or expired', prevention_tip: 'Always verify pre-auth before admission', severity: 'high', appealable: true },
            { code: 'CO-16', category: 'documentation', description: 'Missing or incomplete claim information', common_cause: 'Mandatory fields left blank', prevention_tip: 'Use form validation before submission', severity: 'medium', appealable: true },
            { code: 'CO-18', category: 'duplicate', description: 'Duplicate claim submitted', common_cause: 'Same claim sent multiple times', prevention_tip: 'Check claim status before resubmission', severity: 'low', appealable: false },
            { code: 'CO-22', category: 'coordination', description: 'Coordination of benefits error', common_cause: 'Another insurer should be primary', prevention_tip: 'Verify primary/secondary insurance at registration', severity: 'medium', appealable: true },
            { code: 'CO-27', category: 'eligibility', description: 'Insurance or coverage expired', common_cause: 'Policy lapse or coverage ended', prevention_tip: 'Real-time eligibility verification', severity: 'high', appealable: false },
            { code: 'CO-29', category: 'timeline', description: 'Time limit for filing claim expired', common_cause: 'Claim submitted after deadline', prevention_tip: 'Automated claim submission reminders', severity: 'high', appealable: false },
            { code: 'CO-45', category: 'charges', description: 'Excessive charges billed', common_cause: 'Charges exceed usual and customary rates', prevention_tip: 'Price benchmarking against market rates', severity: 'medium', appealable: true },
            { code: 'CO-50', category: 'necessity', description: 'Service is not medically necessary', common_cause: 'Insufficient documentation of necessity', prevention_tip: 'Include detailed clinical notes', severity: 'high', appealable: true },
            { code: 'CO-97', category: 'bundling', description: 'Procedure part of global period', common_cause: 'Service included in another procedure', prevention_tip: 'Check bundling rules for procedures', severity: 'medium', appealable: true },
            { code: 'CO-167', category: 'coverage', description: 'Diagnosis not covered', common_cause: 'Treatment for excluded condition', prevention_tip: 'Verify coverage before treatment', severity: 'high', appealable: true },
            { code: 'CO-204', category: 'documentation', description: 'Missing or insufficient documentation', common_cause: 'Medical records not attached', prevention_tip: 'Attach all required documents', severity: 'high', appealable: true },
            { code: 'PR-27', category: 'exclusion', description: 'Pre-existing condition exclusion', common_cause: 'Condition existed before policy start', prevention_tip: 'Verify waiting period completion', severity: 'high', appealable: true },
            { code: 'PR-96', category: 'patient', description: 'Patient responsibility - non-covered service', common_cause: 'Service explicitly excluded from policy', prevention_tip: 'Inform patient of non-covered services', severity: 'medium', appealable: false }
        ];

        for (const dc of denialCodes) {
            await pool.query(`
                INSERT INTO denial_codes (code, category, description, common_cause, prevention_tip, severity, appealable)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (code) DO UPDATE SET
                    description = EXCLUDED.description,
                    common_cause = EXCLUDED.common_cause,
                    prevention_tip = EXCLUDED.prevention_tip
            `, [dc.code, dc.category, dc.description, dc.common_cause, dc.prevention_tip, dc.severity, dc.appealable]);
        }
        console.log(`  ✓ ${denialCodes.length} denial codes seeded`);

        // ==========================================
        // SEED SAMPLE TRAINING DATA
        // ==========================================
        console.log('\n📊 Seeding Sample Training Data...');

        const trainingData = [
            // Approved claims
            { claim_amount: 50000, approved_amount: 48000, patient_age: 45, gender: 'M', diagnosis_codes: ['I10', 'E11.9'], procedure_codes: ['99213'], provider_id: 1, policy_type: 'individual', length_of_stay: 3, room_type: 'semi-private', preauth_approved: true, documentation_score: 95, outcome: 'approved', denial_code: null, processing_days: 5 },
            { claim_amount: 125000, approved_amount: 120000, patient_age: 62, gender: 'F', diagnosis_codes: ['K80.20'], procedure_codes: ['47562'], provider_id: 2, policy_type: 'floater', length_of_stay: 4, room_type: 'private', preauth_approved: true, documentation_score: 90, outcome: 'approved', denial_code: null, processing_days: 7 },
            { claim_amount: 35000, approved_amount: 35000, patient_age: 28, gender: 'F', diagnosis_codes: ['O80'], procedure_codes: ['59400'], provider_id: 3, policy_type: 'maternity', length_of_stay: 2, room_type: 'semi-private', preauth_approved: true, documentation_score: 98, outcome: 'approved', denial_code: null, processing_days: 4 },
            // Partially approved
            { claim_amount: 80000, approved_amount: 60000, patient_age: 55, gender: 'M', diagnosis_codes: ['I21.0'], procedure_codes: ['92941'], provider_id: 1, policy_type: 'group', length_of_stay: 5, room_type: 'private', preauth_approved: true, documentation_score: 75, outcome: 'partial', denial_code: 'CO-45', processing_days: 12 },
            { claim_amount: 150000, approved_amount: 100000, patient_age: 70, gender: 'M', diagnosis_codes: ['C34.90'], procedure_codes: ['32480'], provider_id: 4, policy_type: 'individual', length_of_stay: 10, room_type: 'icu', preauth_approved: true, documentation_score: 80, outcome: 'partial', denial_code: 'CO-45', processing_days: 15 },
            // Denied claims
            { claim_amount: 45000, approved_amount: 0, patient_age: 35, gender: 'M', diagnosis_codes: ['Z41.1'], procedure_codes: ['15830'], provider_id: 2, policy_type: 'individual', length_of_stay: 1, room_type: 'daycare', preauth_approved: false, documentation_score: 60, outcome: 'denied', denial_code: 'CO-50', processing_days: 8 },
            { claim_amount: 25000, approved_amount: 0, patient_age: 40, gender: 'F', diagnosis_codes: ['E11.9'], procedure_codes: ['99213'], provider_id: 3, policy_type: 'group', length_of_stay: 2, room_type: 'general', preauth_approved: false, documentation_score: 40, outcome: 'denied', denial_code: 'PR-27', processing_days: 6 },
            { claim_amount: 75000, approved_amount: 0, patient_age: 50, gender: 'M', diagnosis_codes: ['K35.80'], procedure_codes: ['44950'], provider_id: 5, policy_type: 'floater', length_of_stay: 3, room_type: 'semi-private', preauth_approved: true, documentation_score: 50, outcome: 'denied', denial_code: 'CO-204', processing_days: 20 },
            // More approved for balance
            { claim_amount: 200000, approved_amount: 195000, patient_age: 58, gender: 'M', diagnosis_codes: ['I25.10'], procedure_codes: ['33533'], provider_id: 1, policy_type: 'individual', length_of_stay: 7, room_type: 'icu', preauth_approved: true, documentation_score: 92, outcome: 'approved', denial_code: null, processing_days: 6 },
            { claim_amount: 40000, approved_amount: 38000, patient_age: 32, gender: 'F', diagnosis_codes: ['N84.0'], procedure_codes: ['58558'], provider_id: 2, policy_type: 'group', length_of_stay: 1, room_type: 'daycare', preauth_approved: true, documentation_score: 88, outcome: 'approved', denial_code: null, processing_days: 5 }
        ];

        for (const td of trainingData) {
            await pool.query(`
                INSERT INTO claim_training_data 
                (claim_amount, approved_amount, patient_age, gender, diagnosis_codes, procedure_codes, 
                 provider_id, policy_type, length_of_stay, room_type, preauth_approved, 
                 documentation_score, outcome, denial_code, processing_days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [td.claim_amount, td.approved_amount, td.patient_age, td.gender, td.diagnosis_codes,
            td.procedure_codes, td.provider_id, td.policy_type, td.length_of_stay, td.room_type,
            td.preauth_approved, td.documentation_score, td.outcome, td.denial_code, td.processing_days]);
        }
        console.log(`  ✓ ${trainingData.length} training data records seeded`);

        console.log('\n✅ Payment Phase Migration Complete!');
        console.log('\n📋 Summary:');
        console.log('  - Payment gateway tables: 3');
        console.log('  - Insurance/TPA tables: 5');
        console.log('  - AI training tables: 4');
        console.log('  - Top 5 TPAs seeded');
        console.log('  - 15 denial codes seeded');
        console.log('  - 10 training data records seeded');

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

runPaymentPhase();
