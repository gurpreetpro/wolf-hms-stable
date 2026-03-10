-- Phase 4: Diagnostics Tables

-- Lab Test Types (Catalog)
CREATE TABLE IF NOT EXISTS lab_test_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    normal_range TEXT
);

-- Seed Lab Tests
INSERT INTO lab_test_types (name, price, normal_range) VALUES
('CBC', 50.00, 'Hemoglobin: 13-17, Platelets: 150k-450k'),
('Lipid Profile', 80.00, 'Cholesterol < 200'),
('X-Ray Chest', 100.00, 'N/A')
ON CONFLICT (name) DO NOTHING;

-- Lab Requests (Queue)
CREATE TABLE IF NOT EXISTS lab_requests (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id), -- For OPD
    doctor_id INT REFERENCES users(id),
    test_type_id INT REFERENCES lab_test_types(id),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sample Collected', 'Completed')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Results (Data)
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id),
    result_json JSONB, -- Stores parsed values like { hemoglobin: 14.5 }
    file_path VARCHAR(255), -- Path to uploaded PDF
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    technician_id INT REFERENCES users(id)
);

-- Pharmacy Inventory
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    stock_quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    price_per_unit DECIMAL(10, 2) NOT NULL
);

-- Seed Inventory
INSERT INTO inventory_items (name, batch_number, expiry_date, stock_quantity, price_per_unit) VALUES
('Paracetamol 500mg', 'BATCH001', '2026-12-31', 1000, 0.50),
('Amoxicillin 500mg', 'BATCH002', '2025-06-30', 500, 1.20),
('IV Fluid NS', 'BATCH003', '2025-12-31', 200, 5.00)
ON CONFLICT (name) DO NOTHING;
