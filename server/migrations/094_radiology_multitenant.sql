ALTER TABLE radiology_templates
ADD COLUMN IF NOT EXISTS hospital_id INTEGER REFERENCES hospitals(id);
CREATE INDEX IF NOT EXISTS idx_radiology_templates_hospital_id ON radiology_templates(hospital_id);