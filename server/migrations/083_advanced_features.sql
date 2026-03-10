-- Migration 083: White-Label Theming & i18n
-- Part of Phase 6: Advanced Features (Gold Standard HMS)
-- 1. Hospital branding/theming table
CREATE TABLE IF NOT EXISTS hospital_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE UNIQUE,
    -- Logo & Images
    logo_url TEXT,
    favicon_url TEXT,
    login_background_url TEXT,
    -- Colors (CSS variables)
    primary_color VARCHAR(20) DEFAULT '#667eea',
    secondary_color VARCHAR(20) DEFAULT '#764ba2',
    accent_color VARCHAR(20) DEFAULT '#10b981',
    background_color VARCHAR(20) DEFAULT '#f8fafc',
    text_primary VARCHAR(20) DEFAULT '#1a1a2e',
    text_secondary VARCHAR(20) DEFAULT '#64748b',
    -- Typography
    font_family VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
    heading_font VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
    -- Layout
    sidebar_style VARCHAR(20) DEFAULT 'modern',
    -- modern, classic, minimal
    header_style VARCHAR(20) DEFAULT 'fixed',
    -- fixed, static
    -- Custom CSS (advanced)
    custom_css TEXT,
    -- Footer
    footer_text TEXT,
    powered_by_visible BOOLEAN DEFAULT TRUE,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(id),
    -- FCM Token
    fcm_token TEXT,
    device_type VARCHAR(20),
    -- android, ios, web
    -- Notification types enabled
    enable_push BOOLEAN DEFAULT TRUE,
    enable_email BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT FALSE,
    -- Categories
    notify_appointments BOOLEAN DEFAULT TRUE,
    notify_lab_results BOOLEAN DEFAULT TRUE,
    notify_prescriptions BOOLEAN DEFAULT TRUE,
    notify_emergency BOOLEAN DEFAULT TRUE,
    notify_admin BOOLEAN DEFAULT TRUE,
    -- Quiet hours
    quiet_start TIME,
    quiet_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_type)
);
-- 3. Translations table for i18n
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    locale VARCHAR(10) NOT NULL,
    -- en, hi, mr, ta, etc.
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    context VARCHAR(100),
    -- module or page context
    hospital_id INTEGER REFERENCES hospitals(id),
    -- NULL for global
    UNIQUE(locale, key, hospital_id)
);
-- 4. Seed default translations (English + Hindi)
INSERT INTO translations (locale, key, value, context)
VALUES -- Navigation
    ('en', 'nav.dashboard', 'Dashboard', 'navigation'),
    ('hi', 'nav.dashboard', 'डैशबोर्ड', 'navigation'),
    ('en', 'nav.patients', 'Patients', 'navigation'),
    ('hi', 'nav.patients', 'मरीज़', 'navigation'),
    (
        'en',
        'nav.appointments',
        'Appointments',
        'navigation'
    ),
    (
        'hi',
        'nav.appointments',
        'अपॉइंटमेंट',
        'navigation'
    ),
    ('en', 'nav.pharmacy', 'Pharmacy', 'navigation'),
    ('hi', 'nav.pharmacy', 'फार्मेसी', 'navigation'),
    ('en', 'nav.lab', 'Laboratory', 'navigation'),
    ('hi', 'nav.lab', 'प्रयोगशाला', 'navigation'),
    ('en', 'nav.billing', 'Billing', 'navigation'),
    ('hi', 'nav.billing', 'बिलिंग', 'navigation'),
    -- Common actions
    ('en', 'action.save', 'Save', 'common'),
    ('hi', 'action.save', 'सहेजें', 'common'),
    ('en', 'action.cancel', 'Cancel', 'common'),
    ('hi', 'action.cancel', 'रद्द करें', 'common'),
    ('en', 'action.delete', 'Delete', 'common'),
    ('hi', 'action.delete', 'हटाएं', 'common'),
    ('en', 'action.edit', 'Edit', 'common'),
    ('hi', 'action.edit', 'संपादित करें', 'common'),
    ('en', 'action.search', 'Search', 'common'),
    ('hi', 'action.search', 'खोजें', 'common'),
    -- Status
    ('en', 'status.active', 'Active', 'common'),
    ('hi', 'status.active', 'सक्रिय', 'common'),
    ('en', 'status.inactive', 'Inactive', 'common'),
    ('hi', 'status.inactive', 'निष्क्रिय', 'common'),
    ('en', 'status.pending', 'Pending', 'common'),
    ('hi', 'status.pending', 'लंबित', 'common') ON CONFLICT (locale, key, hospital_id) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);