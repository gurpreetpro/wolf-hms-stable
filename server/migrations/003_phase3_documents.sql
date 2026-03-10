CREATE TABLE IF NOT EXISTS patient_documents (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    document_type VARCHAR(50),
    -- e.g., 'ID Proof', 'Insurance Card', 'Previous Report'
    file_path TEXT NOT NULL,
    original_name TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);