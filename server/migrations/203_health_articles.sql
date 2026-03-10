-- Wolf HMS Migration 203: Health Articles System
-- Supports Wolf Care patient app health education content
-- =============================================================
-- Table: health_articles
-- Stores health education articles for patients
-- =============================================================
CREATE TABLE IF NOT EXISTS health_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    category VARCHAR(50) NOT NULL,
    tags TEXT [] DEFAULT '{}',
    author_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        author_name VARCHAR(200),
        read_time_minutes INTEGER DEFAULT 5,
        views_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMP,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_articles_category ON health_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON health_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON health_articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_articles_hospital ON health_articles(hospital_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON health_articles(slug);
-- =============================================================
-- Table: article_categories
-- Categories for health articles
-- =============================================================
CREATE TABLE IF NOT EXISTS article_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(10),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE
);
-- Seed default categories
INSERT INTO article_categories (name, slug, icon, sort_order)
VALUES ('General Health', 'general-health', '🏥', 1),
    ('Nutrition & Diet', 'nutrition-diet', '🥗', 2),
    ('Mental Health', 'mental-health', '🧠', 3),
    (
        'Fitness & Exercise',
        'fitness-exercise',
        '🏃',
        4
    ),
    (
        'Chronic Conditions',
        'chronic-conditions',
        '💊',
        5
    ),
    ('Preventive Care', 'preventive-care', '🛡️', 6),
    ('Women''s Health', 'womens-health', '👩', 7),
    (
        'Children''s Health',
        'childrens-health',
        '👶',
        8
    ),
    ('Senior Care', 'senior-care', '👴', 9),
    ('COVID-19', 'covid-19', '🦠', 10) ON CONFLICT (slug) DO NOTHING;
-- =============================================================
-- Table: article_bookmarks
-- Patient bookmarks for articles
-- =============================================================
CREATE TABLE IF NOT EXISTS article_bookmarks (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES health_articles(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(article_id, patient_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_patient ON article_bookmarks(patient_id);
-- =============================================================
-- Table: article_reading_history
-- Track what patients have read
-- =============================================================
CREATE TABLE IF NOT EXISTS article_reading_history (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES health_articles(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    read_percentage INTEGER DEFAULT 0,
    last_read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(article_id, patient_id)
);
CREATE INDEX IF NOT EXISTS idx_reading_patient ON article_reading_history(patient_id);
-- =============================================================
-- Table: daily_health_tips
-- Daily tips shown to patients
-- =============================================================
CREATE TABLE IF NOT EXISTS daily_health_tips (
    id SERIAL PRIMARY KEY,
    tip_text VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    icon VARCHAR(10) DEFAULT '💡',
    is_active BOOLEAN DEFAULT true,
    display_date DATE,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Seed sample tips
INSERT INTO daily_health_tips (tip_text, category, icon)
VALUES (
        'Drink at least 8 glasses of water daily to stay hydrated.',
        'hydration',
        '💧'
    ),
    (
        'Take a 5-minute break every hour if you work at a desk.',
        'posture',
        '🧘'
    ),
    (
        'Include leafy greens in at least one meal today.',
        'nutrition',
        '🥬'
    ),
    (
        'Get 7-8 hours of sleep for optimal health.',
        'sleep',
        '😴'
    ),
    (
        'Walk for 30 minutes daily to improve cardiovascular health.',
        'fitness',
        '🚶'
    ),
    (
        'Practice deep breathing for 5 minutes to reduce stress.',
        'mental',
        '🧘'
    ),
    (
        'Wash your hands thoroughly for at least 20 seconds.',
        'hygiene',
        '🧼'
    ),
    (
        'Schedule your annual health checkup today.',
        'preventive',
        '📅'
    ),
    (
        'Limit screen time before bed for better sleep.',
        'sleep',
        '📱'
    ),
    (
        'Add fiber-rich foods to your diet for digestive health.',
        'nutrition',
        '🌾'
    ) ON CONFLICT DO NOTHING;
-- =============================================================
-- Trigger: Generate slug from title
-- =============================================================
CREATE OR REPLACE FUNCTION generate_article_slug() RETURNS TRIGGER AS $$ BEGIN IF NEW.slug IS NULL
    OR NEW.slug = '' THEN NEW.slug = LOWER(
        REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9]+', '-', 'g')
    );
NEW.slug = TRIM(
    BOTH '-'
    FROM NEW.slug
);
-- Append ID to ensure uniqueness
NEW.slug = NEW.slug || '-' || COALESCE(NEW.id::text, floor(random() * 10000)::text);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_generate_article_slug ON health_articles;
CREATE TRIGGER trigger_generate_article_slug BEFORE
INSERT ON health_articles FOR EACH ROW EXECUTE FUNCTION generate_article_slug();
-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_article_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_article_timestamp ON health_articles;
CREATE TRIGGER trigger_update_article_timestamp BEFORE
UPDATE ON health_articles FOR EACH ROW EXECUTE FUNCTION update_article_timestamp();
-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (203, 'health_articles_system', NOW()) ON CONFLICT (version) DO NOTHING;