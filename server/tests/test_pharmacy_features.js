require('dotenv').config();
const axios = require('axios');
const pool = require('./config/db');

const API_URL = 'http://localhost:5001/api';
let token;
let supplierId;
let itemId;

const bcrypt = require('bcryptjs');

const login = async () => {
    try {
        // Reset Password for test user
        console.log('Resetting password...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        await pool.query("UPDATE users SET password = $1 WHERE username = 'pharmacist_user'", [hashedPassword]);
        console.log('Password reset successful.');

        const res = await axios.post(`${API_URL}/auth/login`, {
            username: 'pharmacist_user',
            password: 'password123'
        });
        token = res.data.token;
        console.log('✅ Login successful');
    } catch (err) {
        console.error('❌ Login failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        } else if (err.request) {
            console.error('No response received:', err.request);
        } else {
            console.error('Error details:', err);
        }
        process.exit(1);
    }
};

const testSuppliers = async () => {
    try {
        // Add Supplier
        const res = await axios.post(`${API_URL}/pharmacy/suppliers`, {
            name: 'Test Pharma Corp',
            contact_person: 'Test Agent',
            phone: '1234567890',
            email: 'test@pharma.com',
            address: '123 Test St'
        }, { headers: { Authorization: `Bearer ${token}` } });
        supplierId = res.data.id;
        console.log('✅ Add Supplier passed');

        // Get Suppliers
        const listRes = await axios.get(`${API_URL}/pharmacy/suppliers`, { headers: { Authorization: `Bearer ${token}` } });
        if (listRes.data.length > 0) console.log('✅ Get Suppliers passed');
        else console.error('❌ Get Suppliers failed');
    } catch (err) {
        console.error('❌ Supplier tests failed:', err.response?.data || err.message);
    }
};

const testPurchaseOrder = async () => {
    try {
        const res = await axios.post(`${API_URL}/pharmacy/orders`, {
            supplier_id: supplierId,
            items: [
                { item_name: 'New Drug A', quantity: 100, unit_price: 10.50 },
                { item_name: 'New Drug B', quantity: 50, unit_price: 20.00 }
            ]
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Create PO passed');

        const listRes = await axios.get(`${API_URL}/pharmacy/orders`, { headers: { Authorization: `Bearer ${token}` } });
        if (listRes.data.length > 0) console.log('✅ Get POs passed');
    } catch (err) {
        console.error('❌ PO tests failed:', err.response?.data || err.message);
    }
};

const testInventoryAndDispense = async () => {
    try {
        // Add Item
        const itemRes = await axios.post(`${API_URL}/pharmacy/inventory`, {
            name: 'Test Drug X',
            batch_number: 'B001',
            expiry_date: '2025-12-31',
            stock_quantity: 50,
            reorder_level: 10,
            price_per_unit: 5.00
        }, { headers: { Authorization: `Bearer ${token}` } });
        itemId = itemRes.data.id;
        console.log('✅ Add Inventory Item passed');

        // Dispense
        await axios.post(`${API_URL}/pharmacy/dispense`, {
            item: 'Test Drug X',
            quantity: 5,
            notes: 'Test Dispense'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Dispense passed');

        // Check Logs
        const logsRes = await axios.get(`${API_URL}/pharmacy/logs`, { headers: { Authorization: `Bearer ${token}` } });
        const log = logsRes.data.find(l => l.item_name === 'Test Drug X');
        if (log) console.log('✅ Dispense Log verified');
        else console.error('❌ Dispense Log missing');

        // Check Stock
        const invRes = await axios.get(`${API_URL}/pharmacy/inventory`, { headers: { Authorization: `Bearer ${token}` } });
        const item = invRes.data.find(i => i.name === 'Test Drug X');
        if (item.stock_quantity === 45) console.log('✅ Stock Update verified');
        else console.error(`❌ Stock Update failed: Expected 45, got ${item.stock_quantity}`);

    } catch (err) {
        console.error('❌ Inventory/Dispense tests failed:', err.response?.data || err.message);
    }
};

const testExpiring = async () => {
    try {
        // Add expiring item
        await axios.post(`${API_URL}/pharmacy/inventory`, {
            name: 'Expiring Drug Y',
            batch_number: 'B002',
            expiry_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], // 10 days from now
            stock_quantity: 10,
            price_per_unit: 2.00
        }, { headers: { Authorization: `Bearer ${token}` } });

        const res = await axios.get(`${API_URL}/pharmacy/inventory/expiring`, { headers: { Authorization: `Bearer ${token}` } });
        const found = res.data.find(i => i.name === 'Expiring Drug Y');
        if (found) console.log('✅ Expiry Alert verified');
        else console.error('❌ Expiry Alert failed');
    } catch (err) {
        console.error('❌ Expiry tests failed:', err.response?.data || err.message);
    }
};

const runTests = async () => {
    await login();
    await testSuppliers();
    await testPurchaseOrder();
    await testInventoryAndDispense();
    await testExpiring();
};

runTests();
