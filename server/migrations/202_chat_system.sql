-- Wolf HMS Migration 202: Chat System
-- Supports Wolf Care patient-doctor messaging
-- =============================================================
-- Table: chat_threads
-- Stores conversation threads between patients and doctors
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_threads (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE
    SET NULL,
        subject VARCHAR(200),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
        last_message_at TIMESTAMP,
        unread_patient INTEGER DEFAULT 0,
        unread_doctor INTEGER DEFAULT 0,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_patient ON chat_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_doctor ON chat_threads(doctor_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON chat_threads(status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_hospital ON chat_threads(hospital_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_unique ON chat_threads(patient_id, doctor_id)
WHERE status = 'active';
-- =============================================================
-- Table: chat_messages
-- Stores individual messages within threads
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (
        message_type IN (
            'text',
            'image',
            'file',
            'prescription',
            'lab_result'
        )
    ),
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_type, sender_id);
-- =============================================================
-- Table: chat_quick_replies
-- Pre-defined quick reply templates for doctors
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_quick_replies (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_global BOOLEAN DEFAULT false,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Seed default quick replies
INSERT INTO chat_quick_replies (text, category, is_global, sort_order)
VALUES (
        'Please take rest and continue the prescribed medication.',
        'General',
        true,
        1
    ),
    (
        'If symptoms persist, please schedule a follow-up visit.',
        'Follow-up',
        true,
        2
    ),
    (
        'Continue monitoring your vitals and note any changes.',
        'Monitoring',
        true,
        3
    ),
    (
        'Your test results look normal. No immediate concern.',
        'Results',
        true,
        4
    ),
    (
        'Please visit the emergency department immediately.',
        'Urgent',
        true,
        5
    ),
    (
        'I have sent a new prescription to the pharmacy.',
        'Prescription',
        true,
        6
    ),
    (
        'Please ensure you complete the full course of antibiotics.',
        'Medication',
        true,
        7
    ),
    (
        'Drink plenty of fluids and get adequate sleep.',
        'General',
        true,
        8
    ) ON CONFLICT DO NOTHING;
-- =============================================================
-- Triggers: Update thread timestamps and counters
-- =============================================================
CREATE OR REPLACE FUNCTION update_thread_on_message() RETURNS TRIGGER AS $$ BEGIN
UPDATE chat_threads
SET last_message_at = NEW.created_at,
    updated_at = NOW(),
    unread_patient = CASE
        WHEN NEW.sender_type = 'doctor' THEN unread_patient + 1
        ELSE unread_patient
    END,
    unread_doctor = CASE
        WHEN NEW.sender_type = 'patient' THEN unread_doctor + 1
        ELSE unread_doctor
    END
WHERE id = NEW.thread_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON chat_messages;
CREATE TRIGGER trigger_update_thread_on_message
AFTER
INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();
-- Trigger to reset unread count when messages are read
CREATE OR REPLACE FUNCTION reset_unread_on_read() RETURNS TRIGGER AS $$ BEGIN IF NEW.is_read = true
    AND OLD.is_read = false THEN -- Determine who read it based on sender type
    IF NEW.sender_type = 'doctor' THEN
UPDATE chat_threads
SET unread_patient = GREATEST(0, unread_patient - 1)
WHERE id = NEW.thread_id;
ELSE
UPDATE chat_threads
SET unread_doctor = GREATEST(0, unread_doctor - 1)
WHERE id = NEW.thread_id;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_reset_unread_on_read ON chat_messages;
CREATE TRIGGER trigger_reset_unread_on_read
AFTER
UPDATE OF is_read ON chat_messages FOR EACH ROW EXECUTE FUNCTION reset_unread_on_read();
-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (202, 'chat_system', NOW()) ON CONFLICT (version) DO NOTHING;