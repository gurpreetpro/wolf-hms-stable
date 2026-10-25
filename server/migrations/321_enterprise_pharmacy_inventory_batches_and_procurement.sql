-- Migration 321: Enterprise Pharmacy Inventory Batches, Dosage Forms, GRN & Procurement Upgrade
-- Idempotent, safe transactional migration

BEGIN;

-- 1. Upgrade inventory_items with Full Enterprise HMS Columns
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50) DEFAULT 'Tablet',
  ADD COLUMN IF NOT EXISTS strength VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(50) DEFAULT '10s Strip',
  ADD COLUMN IF NOT EXISTS mfg_date DATE,
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 12.00;

-- 2. Drop restrictive UNIQUE constraint on (name, hospital_id) to allow multi-batch stocking / FEFO
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS unique_drug_name_hospital;
DROP INDEX IF EXISTS unique_drug_name_hospital;

-- Create composite index allowing distinct batches of the same medicine
CREATE UNIQUE INDEX IF NOT EXISTS unique_drug_batch_hospital 
  ON inventory_items (LOWER(name), COALESCE(batch_number, 'DEFAULT'), COALESCE(hospital_id, 1));

-- 3. Backfill all 8 existing inventory_items with realistic master data
UPDATE inventory_items SET
  batch_number = 'PCM-2601',
  mfg_date = '2025-01-10'::date,
  expiry_date = '2027-12-31'::date,
  dosage_form = 'Tablet',
  strength = '500mg',
  pack_size = '10s Strip',
  manufacturer = 'Cipla Ltd.',
  rack_location = 'A-1',
  hsn_code = '30049099',
  mrp = 3.00,
  cost_price = 1.40,
  gst_percent = 12.00,
  schedule_type = 'OTC',
  is_controlled = false
WHERE id = 1 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'AMX-2602',
  mfg_date = '2025-02-15'::date,
  expiry_date = '2027-08-31'::date,
  dosage_form = 'Capsule',
  strength = '500mg',
  pack_size = '10s Strip',
  manufacturer = 'Sun Pharma',
  rack_location = 'A-2',
  hsn_code = '30049099',
  mrp = 12.00,
  cost_price = 6.00,
  gst_percent = 12.00,
  schedule_type = 'H',
  is_controlled = false
WHERE id = 2 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'MET-2603',
  mfg_date = '2025-03-01'::date,
  expiry_date = '2028-02-28'::date,
  dosage_form = 'Tablet',
  strength = '500mg',
  pack_size = '10s Strip',
  manufacturer = 'USV Private Ltd.',
  rack_location = 'B-1',
  hsn_code = '30049099',
  mrp = 6.00,
  cost_price = 2.80,
  gst_percent = 12.00,
  schedule_type = 'H',
  is_controlled = false
WHERE id = 3 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'ATV-2604',
  mfg_date = '2025-01-20'::date,
  expiry_date = '2027-11-30'::date,
  dosage_form = 'Tablet',
  strength = '10mg',
  pack_size = '10s Strip',
  manufacturer = 'Zydus Cadila',
  rack_location = 'B-2',
  hsn_code = '30049099',
  mrp = 18.00,
  cost_price = 8.50,
  gst_percent = 12.00,
  schedule_type = 'H',
  is_controlled = false
WHERE id = 4 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'PAN-2605',
  mfg_date = '2025-04-10'::date,
  expiry_date = '2028-04-30'::date,
  dosage_form = 'Tablet',
  strength = '40mg',
  pack_size = '10s Strip',
  manufacturer = 'Alkem Laboratories',
  rack_location = 'C-1',
  hsn_code = '30049099',
  mrp = 10.50,
  cost_price = 4.90,
  gst_percent = 12.00,
  schedule_type = 'OTC',
  is_controlled = false
WHERE id = 5 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'CET-2606',
  mfg_date = '2025-02-01'::date,
  expiry_date = '2027-06-30'::date,
  dosage_form = 'Tablet',
  strength = '10mg',
  pack_size = '10s Strip',
  manufacturer = 'Dr. Reddy''s Laboratories',
  rack_location = 'C-2',
  hsn_code = '30049099',
  mrp = 4.00,
  cost_price = 1.75,
  gst_percent = 12.00,
  schedule_type = 'OTC',
  is_controlled = false
WHERE id = 6 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'IBU-2607',
  mfg_date = '2025-03-15'::date,
  expiry_date = '2028-01-31'::date,
  dosage_form = 'Tablet',
  strength = '400mg',
  pack_size = '10s Strip',
  manufacturer = 'Abbott India',
  rack_location = 'A-3',
  hsn_code = '30049099',
  mrp = 5.00,
  cost_price = 2.10,
  gst_percent = 12.00,
  schedule_type = 'OTC',
  is_controlled = false
WHERE id = 7 AND hospital_id = 1;

UPDATE inventory_items SET
  batch_number = 'MTZ-2608',
  mfg_date = '2025-01-05'::date,
  expiry_date = '2027-10-31'::date,
  dosage_form = 'Tablet',
  strength = '400mg',
  pack_size = '10s Strip',
  manufacturer = 'J.B. Chemicals',
  rack_location = 'B-3',
  hsn_code = '30049099',
  mrp = 7.00,
  cost_price = 3.15,
  gst_percent = 12.00,
  schedule_type = 'H1',
  is_controlled = false
WHERE id = 8 AND hospital_id = 1;

-- 4. Insert 3 Diverse Dosage-Form Items (IV Fluid, Injection, Syrup)
INSERT INTO inventory_items (
  name, generic_name, category, dosage_form, strength, pack_size,
  batch_number, mfg_date, expiry_date, manufacturer, rack_location,
  hsn_code, stock_quantity, reorder_level, price_per_unit, cost_price,
  mrp, gst_percent, schedule_type, is_controlled, hospital_id, barcode
) VALUES 
  (
    'Normal Saline 0.9% 500ml', 'Sodium Chloride 0.9%', 'Infusion', 'IV Fluid', '0.9% w/v', '500ml Bottle',
    'NS-2609', '2025-05-01'::date, '2028-05-31'::date, 'Baxter India', 'IV-Bay-1',
    '30049099', 500, 50, 45.00, 28.00,
    60.00, 12.00, 'OTC', false, 1, 'BAR-NS-09-500'
  ),
  (
    'Ceftriaxone 1g Inj', 'Ceftriaxone Sodium', 'Antibiotic', 'Injection (IV/IM)', '1g', '1 Vial + WFI',
    'CTX-2610', '2025-02-10'::date, '2027-02-28'::date, 'Aristo Pharma', 'Inj-Bay-2',
    '30042099', 300, 40, 85.00, 52.00,
    115.00, 12.00, 'H1', false, 1, 'BAR-CTX-1G-INJ'
  ),
  (
    'Ambroxol Cough Syrup 100ml', 'Ambroxol HCl + Levocetirizine', 'Respiratory', 'Syrup', '30mg/5ml', '100ml Bottle',
    'AMB-2611', '2025-03-20'::date, '2027-09-30'::date, 'Mankind Pharma', 'S-1',
    '30049099', 250, 30, 65.00, 38.00,
    85.00, 12.00, 'OTC', false, 1, 'BAR-AMB-100-SYR'
  )
ON CONFLICT (LOWER(name), COALESCE(batch_number, 'DEFAULT'), COALESCE(hospital_id, 1)) DO NOTHING;

-- 5. Extend suppliers table
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS gstin VARCHAR(50),
  ADD COLUMN IF NOT EXISTS drug_license_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Seed Verified Suppliers for Hospital 1
INSERT INTO suppliers (name, contact_person, phone, email, address, gstin, drug_license_no, payment_terms, hospital_id)
VALUES
  ('Cipla Pharmaceuticals Ltd.', 'Rajesh Verma', '9876543210', 'supply@cipla.com', 'Plot 48, Industrial Area, Phase II, New Delhi', '07AAACC1206D1ZS', 'DL-DL-2024-001', 'Net 30', 1),
  ('Sun Pharma Distributors', 'Amit Shah', '9876543211', 'orders@sunpharma.com', 'Building 12, Logistics Park, Mumbai', '27AAACS1234F1ZR', 'DL-MH-2024-002', 'Net 45', 1),
  ('Dr. Reddy''s Laboratories Logistics', 'Suresh Patel', '9876543212', 'logistics@drreddys.com', 'Survey 110, Tech Zone, Hyderabad', '36AAACD5678G1ZQ', 'DL-TG-2024-003', 'Net 30', 1)
ON CONFLICT DO NOTHING;

-- 6. Extend po_items table with batch and GRN receipt columns
ALTER TABLE po_items
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mfg_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0;

-- Extend purchase_orders with GRN summary columns
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS grn_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(id);

-- 7. Create Goods Received Notes (goods_received_notes) Table for Audit Trail
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(100) UNIQUE NOT NULL,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    received_date TIMESTAMPTZ DEFAULT NOW(),
    total_items INTEGER DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Completed',
    notes TEXT,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE
);

COMMIT;
