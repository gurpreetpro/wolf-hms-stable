-- Wolf Care: Medicine Ordering System Schema
-- Migration: 410_medicine_orders.sql
-- Date: 2026-02-05
-- Description: Adds patient addresses, medicine orders, and delivery tracking
-- ==========================================
-- PATIENT ADDRESSES (Reusable for lab + pharmacy delivery)
-- ==========================================
CREATE TABLE IF NOT EXISTS patient_addresses (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(id),
    -- Address details
    label VARCHAR(50) DEFAULT 'Home',
    -- Home, Office, Other
    address_line TEXT NOT NULL,
    landmark VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    -- GPS coordinates for navigation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    -- Preferences
    is_default BOOLEAN DEFAULT false,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- MEDICINE ORDERS (Prescription-based ordering)
-- ==========================================
CREATE TABLE IF NOT EXISTS medicine_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    -- Relations
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    prescription_id INTEGER REFERENCES prescriptions(id),
    hospital_id INTEGER REFERENCES hospitals(id),
    -- Delivery method
    delivery_type VARCHAR(20) DEFAULT 'delivery' CHECK (delivery_type IN ('pickup', 'delivery')),
    address_id INTEGER REFERENCES patient_addresses(id),
    -- Status tracking
    -- pending → confirmed → preparing → ready → dispatched → delivered/picked_up → cancelled
    status VARCHAR(30) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'dispatched',
            'delivered',
            'picked_up',
            'cancelled'
        )
    ),
    -- Pricing (hospital-configurable)
    subtotal DECIMAL(10, 2) DEFAULT 0,
    delivery_charge DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    -- Payment (hospital-specific methods)
    payment_method VARCHAR(30),
    -- razorpay, cash, card, upi, wallet
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
        payment_status IN (
            'pending',
            'paid',
            'failed',
            'refunded',
            'cod'
        )
    ),
    invoice_id INTEGER REFERENCES invoices(id),
    -- Delivery assignment
    assigned_staff_id INTEGER REFERENCES users(id),
    estimated_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    -- OTP for handover verification
    delivery_otp VARCHAR(6),
    otp_verified BOOLEAN DEFAULT false,
    -- Notes
    patient_notes TEXT,
    pharmacy_notes TEXT,
    cancellation_reason TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- MEDICINE ORDER ITEMS (Line items from prescription)
-- ==========================================
CREATE TABLE IF NOT EXISTS medicine_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES medicine_orders(id) ON DELETE CASCADE,
    -- Medicine info (from inventory)
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    medicine_name VARCHAR(255) NOT NULL,
    -- Quantity and pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    -- From prescription
    dosage VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    -- Fulfillment
    is_available BOOLEAN DEFAULT true,
    substitute_item_id INTEGER REFERENCES inventory_items(id),
    substitute_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- ORDER STATUS LOGS (Tracking history)
-- ==========================================
CREATE TABLE IF NOT EXISTS medicine_order_logs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES medicine_orders(id) ON DELETE CASCADE,
    -- Status change
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    -- Who made the change
    staff_id INTEGER REFERENCES users(id),
    staff_name VARCHAR(100),
    -- GPS at time of update (for delivery tracking)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- DELIVERY STAFF LOCATION (Real-time tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS delivery_staff_locations (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(id),
    -- Current position
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2),
    -- Status
    is_online BOOLEAN DEFAULT true,
    is_busy BOOLEAN DEFAULT false,
    current_order_id INTEGER REFERENCES medicine_orders(id),
    -- Device info
    battery_percent INTEGER,
    -- Timestamp
    last_updated TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- HOSPITAL DELIVERY SETTINGS (Per-hospital configuration)
-- ==========================================
CREATE TABLE IF NOT EXISTS hospital_delivery_settings (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER UNIQUE REFERENCES hospitals(id) ON DELETE CASCADE,
    -- Delivery options
    delivery_enabled BOOLEAN DEFAULT true,
    pickup_enabled BOOLEAN DEFAULT true,
    -- Delivery charges (hospital-configurable)
    delivery_charge_type VARCHAR(20) DEFAULT 'flat' CHECK (
        delivery_charge_type IN (
            'flat',
            'distance',
            'free_above',
            'custom'
        )
    ),
    flat_delivery_charge DECIMAL(10, 2) DEFAULT 50.00,
    per_km_charge DECIMAL(10, 2) DEFAULT 10.00,
    free_delivery_above DECIMAL(10, 2) DEFAULT 500.00,
    max_delivery_radius_km DECIMAL(5, 2) DEFAULT 10.00,
    -- Operating hours
    delivery_start_time TIME DEFAULT '09:00',
    delivery_end_time TIME DEFAULT '21:00',
    -- Payment methods allowed
    allow_cod BOOLEAN DEFAULT true,
    allow_card_on_delivery BOOLEAN DEFAULT false,
    allow_upi_on_delivery BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_patient_addresses_patient ON patient_addresses(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_addresses_hospital ON patient_addresses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_patient ON medicine_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_hospital ON medicine_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_status ON medicine_orders(status);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_assigned ON medicine_orders(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_created ON medicine_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medicine_order_logs_order ON medicine_order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_medicine_order_items_order ON medicine_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_staff_locations_staff ON delivery_staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_delivery_staff_locations_hospital ON delivery_staff_locations(hospital_id);
-- ==========================================
-- ADD 'runner' ROLE TO USERS (for Wolf Runner app)
-- ==========================================
DO $$ BEGIN -- Update role check constraint to include 'runner'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'admin',
            'doctor',
            'nurse',
            'pharmacist',
            'lab_tech',
            'receptionist',
            'ward_incharge',
            'billing',
            'security',
            'phlebotomist',
            'runner',
            'platform_owner'
        )
    );
EXCEPTION
WHEN others THEN RAISE NOTICE 'Role constraint update skipped: %',
SQLERRM;
END $$;
-- ==========================================
-- DEFAULT DELIVERY SETTINGS FOR EXISTING HOSPITALS
-- ==========================================
INSERT INTO hospital_delivery_settings (hospital_id)
SELECT id
FROM hospitals
WHERE id NOT IN (
        SELECT hospital_id
        FROM hospital_delivery_settings
        WHERE hospital_id IS NOT NULL
    ) ON CONFLICT (hospital_id) DO NOTHING;
-- RAISE NOTICE 'Migration 410_medicine_orders.sql completed successfully';