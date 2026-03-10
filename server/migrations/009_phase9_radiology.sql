-- Phase 9: Radiology Upgrade (RIS/PACS Lite)
-- 1. Create Templates Table
CREATE TABLE IF NOT EXISTS radiology_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    -- e.g. "Normal Chest X-Ray"
    modality VARCHAR(50),
    -- e.g. "X-Ray", "CT", "MRI"
    findings_text TEXT,
    impression_text TEXT,
    recommendation_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. Add PACS/AI columns to lab_results (if not exists, we use JSONB but specific columns help)
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS image_url TEXT;
-- For "DICOM Lite" upload
ALTER TABLE lab_results
ADD COLUMN IF NOT EXISTS ai_tags TEXT [];
-- For AI tags e.g. ["Abnormal", "Fracture"]
ALTER TABLE lab_results
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5, 2);
-- e.g. 95.50
-- 3. Seed Initial Templates
INSERT INTO radiology_templates (
        name,
        modality,
        findings_text,
        impression_text,
        recommendation_text
    )
VALUES (
        'Normal Chest X-Ray',
        'X-Ray',
        'Lungs are clear. Heart size is normal. No pneumothorax or plural effusion. Osseuous structures are intact.',
        'Normal Chest X-Ray.',
        'No acute cardiopulmonary process.'
    ),
    (
        'CT Head - Normal',
        'CT Scan',
        'No intracranial hemorrhage, mass effect, or midline shift. Ventricles and sulci are age-appropriate.',
        'Normal CT Head.',
        'None.'
    ),
    (
        'Limb Fracture (Generic)',
        'X-Ray',
        'There is a fracture of the [BONE] shaft with [DISPLACEMENT] displacement. Surrounding soft tissues show mild swelling.',
        'Acute fracture of the [BONE].',
        'Orthopedic consultation recommended.'
    );