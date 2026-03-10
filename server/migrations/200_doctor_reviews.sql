-- Wolf HMS Migration 200: Doctor Reviews System
-- Supports Wolf Care patient app review functionality
-- =============================================================
-- Table: doctor_reviews
-- Stores patient reviews for doctors
-- =============================================================
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE
    SET NULL,
        rating INTEGER NOT NULL CHECK (
            rating >= 1
            AND rating <= 5
        ),
        title VARCHAR(200),
        comment TEXT,
        tags TEXT [] DEFAULT '{}',
        is_anonymous BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' CHECK (
            status IN ('active', 'reported', 'hidden', 'deleted')
        ),
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON doctor_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hospital ON doctor_reviews(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON doctor_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON doctor_reviews(rating);
-- Prevent multiple reviews from same patient for same doctor (within 30 days)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_recent ON doctor_reviews(doctor_id, patient_id)
WHERE created_at > NOW() - INTERVAL '30 days'
    AND status = 'active';
-- =============================================================
-- Table: review_helpful
-- Tracks which patients found a review helpful
-- =============================================================
CREATE TABLE IF NOT EXISTS review_helpful (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES doctor_reviews(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(review_id, patient_id)
);
CREATE INDEX IF NOT EXISTS idx_helpful_review ON review_helpful(review_id);
-- =============================================================
-- Table: review_reports
-- Tracks reported reviews for moderation
-- =============================================================
CREATE TABLE IF NOT EXISTS review_reports (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES doctor_reviews(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES patients(id) ON DELETE
    SET NULL,
        reporter_type VARCHAR(20) DEFAULT 'patient' CHECK (reporter_type IN ('patient', 'doctor', 'admin')),
        reason VARCHAR(50) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (
            status IN (
                'pending',
                'reviewed',
                'dismissed',
                'action_taken'
            )
        ),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_review ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON review_reports(status);
-- =============================================================
-- View: doctor_rating_summary
-- Aggregated ratings for each doctor
-- =============================================================
CREATE OR REPLACE VIEW doctor_rating_summary AS
SELECT doctor_id,
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as avg_rating,
    COUNT(*) FILTER (
        WHERE rating = 5
    ) as five_star,
    COUNT(*) FILTER (
        WHERE rating = 4
    ) as four_star,
    COUNT(*) FILTER (
        WHERE rating = 3
    ) as three_star,
    COUNT(*) FILTER (
        WHERE rating = 2
    ) as two_star,
    COUNT(*) FILTER (
        WHERE rating = 1
    ) as one_star,
    hospital_id
FROM doctor_reviews
WHERE status = 'active'
GROUP BY doctor_id,
    hospital_id;
-- =============================================================
-- Trigger: Update helpful_count on review_helpful changes
-- =============================================================
CREATE OR REPLACE FUNCTION update_helpful_count() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN
UPDATE doctor_reviews
SET helpful_count = helpful_count + 1
WHERE id = NEW.review_id;
ELSIF TG_OP = 'DELETE' THEN
UPDATE doctor_reviews
SET helpful_count = helpful_count - 1
WHERE id = OLD.review_id;
END IF;
RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_helpful_count ON review_helpful;
CREATE TRIGGER trigger_update_helpful_count
AFTER
INSERT
    OR DELETE ON review_helpful FOR EACH ROW EXECUTE FUNCTION update_helpful_count();
-- =============================================================
-- Trigger: Auto-report review when threshold reached
-- =============================================================
CREATE OR REPLACE FUNCTION auto_flag_review() RETURNS TRIGGER AS $$
DECLARE report_count INTEGER;
BEGIN
SELECT COUNT(*) INTO report_count
FROM review_reports
WHERE review_id = NEW.review_id
    AND status = 'pending';
IF report_count >= 3 THEN
UPDATE doctor_reviews
SET status = 'reported'
WHERE id = NEW.review_id
    AND status = 'active';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_auto_flag_review ON review_reports;
CREATE TRIGGER trigger_auto_flag_review
AFTER
INSERT ON review_reports FOR EACH ROW EXECUTE FUNCTION auto_flag_review();
-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (200, 'doctor_reviews_system', NOW()) ON CONFLICT (version) DO NOTHING;