// Quick Database Scanner - Report on payments and invoices
require('dotenv').config();
const pool = require('./config/db');

(async () => {
    try {
        console.log('\n=== WOLF HMS DATABASE SCAN ===\n');
        
        // Payments table
        const payments = await pool.query(`
            SELECT 
                COUNT(*) as total_payments, 
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as completed_amount
            FROM payments
        `);
        console.log('📊 PAYMENTS TABLE:');
        console.log('   Total Payments:', payments.rows[0].total_payments);
        console.log('   Total Amount:', '₹' + parseFloat(payments.rows[0].total_amount).toLocaleString('en-IN'));
        console.log('   Completed Amount:', '₹' + parseFloat(payments.rows[0].completed_amount).toLocaleString('en-IN'));
        
        // Invoices table - check schema first
        const invoices = await pool.query(`
            SELECT 
                COUNT(*) as total_invoices, 
                COALESCE(SUM(total_amount), 0) as total_billed
            FROM invoices
        `);
        console.log('\n📋 INVOICES TABLE:');
        console.log('   Total Invoices:', invoices.rows[0].total_invoices);
        console.log('   Total Billed:', '₹' + parseFloat(invoices.rows[0].total_billed).toLocaleString('en-IN'));
        
        // Invoice status breakdown
        const invStatus = await pool.query(`
            SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
            FROM invoices 
            GROUP BY status 
            ORDER BY count DESC
        `);
        console.log('\n📈 INVOICE STATUS BREAKDOWN:');
        if (invStatus.rows.length === 0) {
            console.log('   (No invoices found)');
        } else {
            invStatus.rows.forEach(row => {
                console.log(`   ${row.status}: ${row.count} invoices (₹${parseFloat(row.amount).toLocaleString('en-IN')})`);
            });
        }
        
        // Payment methods breakdown
        const pMethods = await pool.query(`
            SELECT 
                COALESCE(payment_method, 'Unknown') as method, 
                COUNT(*) as count, 
                COALESCE(SUM(amount), 0) as total 
            FROM payments 
            GROUP BY payment_method 
            ORDER BY total DESC
        `);
        console.log('\n💳 PAYMENT METHODS:');
        if (pMethods.rows.length === 0) {
            console.log('   (No payments found)');
        } else {
            pMethods.rows.forEach(row => {
                console.log(`   ${row.method}: ${row.count} payments (₹${parseFloat(row.total).toLocaleString('en-IN')})`);
            });
        }
        
        // Recent payments
        const recent = await pool.query(`
            SELECT id, amount, payment_date, payment_method, status 
            FROM payments 
            ORDER BY payment_date DESC 
            LIMIT 5
        `);
        console.log('\n🕐 RECENT PAYMENTS:');
        if (recent.rows.length === 0) {
            console.log('   (No recent payments)');
        } else {
            recent.rows.forEach(row => {
                console.log(`   ${row.payment_date?.toISOString()?.split('T')[0] || 'N/A'}: ₹${row.amount} (${row.payment_method}) - ${row.status}`);
            });
        }
        
        console.log('\n=== SCAN COMPLETE ===\n');
        
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
})();
