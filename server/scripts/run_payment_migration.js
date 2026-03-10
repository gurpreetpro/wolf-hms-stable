// Run partial payment migration
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running partial payment migration...\n');

        // Create payments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash',
                reference_number VARCHAR(100),
                notes TEXT,
                received_by INT REFERENCES users(id) ON DELETE SET NULL,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created payments table');

        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_received_at ON payments(received_at)');
        console.log('✓ Created indexes');

        // Add amount_paid column to invoices
        await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00');
        console.log('✓ Added amount_paid column to invoices');

        // Update invoice status constraint
        try {
            await pool.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check');
            await pool.query(`ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
                CHECK (status IN ('Pending', 'Partial', 'Paid', 'Cancelled'))`);
            console.log('✓ Updated invoice status constraint');
        } catch (err) {
            console.log('  Status constraint may already exist (OK)');
        }

        console.log('\n=====================================');
        console.log('✅ Partial payment migration complete!');
        console.log('=====================================');
        console.log('New features:');
        console.log('  - payments table for tracking multiple payments');
        console.log('  - amount_paid column on invoices');
        console.log('  - Partial status for partially paid invoices');
        console.log('=====================================');

        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

runMigration();
