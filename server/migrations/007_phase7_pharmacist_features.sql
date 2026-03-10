-- Phase 7: Pharmacist Features

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INT REFERENCES suppliers(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Received', 'Cancelled')),
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_by INT REFERENCES users(id)
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

-- Dispense Logs Table (History)
CREATE TABLE IF NOT EXISTS dispense_logs (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES inventory_items(id),
    item_name VARCHAR(100),
    quantity INT NOT NULL,
    patient_id UUID REFERENCES patients(id), -- Nullable if dispensed to non-patient (e.g. ward stock)
    patient_name VARCHAR(100),
    dispensed_by INT REFERENCES users(id),
    dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Seed Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('PharmaCorp', 'John Doe', '555-0101', 'sales@pharmacorp.com', '123 Ind Area, Mumbai'),
('MediSupply', 'Jane Smith', '555-0102', 'orders@medisupply.com', '456 Tech Park, Bangalore')
ON CONFLICT DO NOTHING;
