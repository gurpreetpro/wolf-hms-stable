-- Medication Administration Record (MAR)
CREATE TABLE IF NOT EXISTS medication_administration (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    medication_name VARCHAR(100),
    dosage VARCHAR(50),
    administered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    administered_by INT REFERENCES users(id),
    notes TEXT
);

-- Consumable Usage (for billing and inventory)
CREATE TABLE IF NOT EXISTS consumable_usage (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    item_id INT REFERENCES inventory_items(id),
    item_name VARCHAR(100),
    quantity INT,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_by INT REFERENCES users(id)
);

-- Seed Consumables if not present
INSERT INTO inventory_items (name, batch_number, expiry_date, stock_quantity, price_per_unit) VALUES
('Syringe 5ml', 'CONS001', '2030-12-31', 500, 2.00),
('Gloves (Pair)', 'CONS002', '2030-12-31', 1000, 1.00),
('Bandage', 'CONS003', '2030-12-31', 200, 5.00),
('Cannula 20G', 'CONS004', '2028-12-31', 100, 15.00)
ON CONFLICT (name) DO NOTHING;
