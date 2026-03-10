-- Migration: Support for CLMA (Closed Loop Medication Administration)
-- 1. Add barcode to inventory_items for scanning
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
-- 2. Add pharmacy_status to care_tasks to separate "Verification" from "Administration"
-- Default is 'Pending' (Not verified by pharmacy yet)
ALTER TABLE care_tasks
ADD COLUMN IF NOT EXISTS pharmacy_status VARCHAR(20) DEFAULT 'Pending';
-- 3. Add explicit index for nurse dashboard filtering
CREATE INDEX IF NOT EXISTS idx_care_tasks_pharmacy_status ON care_tasks(pharmacy_status);