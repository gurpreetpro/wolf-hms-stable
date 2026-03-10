-- Phase 5: Procurement & Master Data
-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'Draft',
    -- Draft, Pending, Approved, Received, Cancelled
    total_amount DECIMAL(10, 2) DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATE,
    notes TEXT
);
-- 3. PO Items Table
CREATE TABLE IF NOT EXISTS po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    -- Can be NULL if ordering new item not yet in system? No, forcing creation first is better.
    item_name VARCHAR(255),
    -- Snapshot of name
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) DEFAULT 0
);
-- Seed Ledger / Audit for Stock (Good to have, but sticking to basics for now)
-- We will update inventory_items.stock_quantity directly on GRN.
-- SEED Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address)
VALUES (
        'Apollo Pharma Dist',
        'Rajesh Kumar',
        '9876543210',
        'orders@apollopharma.com',
        'Mumbai, MH'
    ),
    (
        'MedPlus Vendors',
        'Amit Singh',
        '9123456780',
        'sales@medplus.com',
        'Delhi, DL'
    ) ON CONFLICT DO NOTHING;