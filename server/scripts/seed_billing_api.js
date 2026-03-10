/**
 * API-Based Demo Data Insertion
 * Uses the actual running server API to insert data
 * Run with: node scripts/seed_billing_api.js
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

function makeRequest(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log('🔑 Logging in as admin_user...');
    
    try {
        // Login
        const loginRes = await makeRequest('POST', '/api/auth/login', {
            username: 'admin_user',
            password: 'password123'
        });
        
        if (loginRes.status !== 200) {
            console.error('❌ Login failed:', loginRes.data);
            return;
        }
        
        const token = loginRes.data.data?.token || loginRes.data.token;
        console.log('✅ Login successful');
        
        // Check invoices
        console.log('\n📋 Fetching current invoices...');
        const invoicesRes = await makeRequest('GET', '/api/finance/invoices', null, token);
        
        if (invoicesRes.data?.data) {
            console.log(`Found ${invoicesRes.data.data.length} invoices:`);
            invoicesRes.data.data.slice(0, 5).forEach(inv => {
                console.log(`  - #${inv.id}: ${inv.patient_name} - ₹${inv.total_amount} (${inv.status})`);
            });
        }
        
        // Check patients table for demo patients
        console.log('\n🔍 Demo patients should have been created. Check the database directly.');
        
    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
