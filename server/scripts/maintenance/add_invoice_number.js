// Add invoice_number column with auto-generation
const pool = require('./config/db');

async function addInvoiceNumber() {
    try {
        console.log('Adding invoice_number to invoices table...\n');

        // Add invoice_number column if not exists
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(20) UNIQUE
        `);
        console.log('✓ Added invoice_number column');

        // Update existing invoices with generated numbers
        const invoices = await pool.query('SELECT id, generated_at FROM invoices ORDER BY id');

        for (const inv of invoices.rows) {
            const year = new Date(inv.generated_at).getFullYear();
            const month = String(new Date(inv.generated_at).getMonth() + 1).padStart(2, '0');
            const invNum = `INV-${year}${month}-${String(inv.id).padStart(4, '0')}`;

            await pool.query(
                'UPDATE invoices SET invoice_number = $1 WHERE id = $2',
                [invNum, inv.id]
            );
            console.log(`  Invoice #${inv.id} → ${invNum}`);
        }

        console.log('\n=====================================');
        console.log('✅ Invoice numbers added successfully!');
        console.log('=====================================');
        console.log('Format: INV-YYYYMM-XXXX');
        console.log('Example: INV-202512-0001');
        console.log('=====================================');

        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

addInvoiceNumber();
