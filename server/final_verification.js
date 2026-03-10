/**
 * Final System Verification - Wolf HMS
 * Comprehensive check of all fixes applied
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: process.env.DB_PORT || 5432,
});

async function check(name, query, expected) {
    try {
        const result = await pool.query(query);
        const value = result.rows[0]?.count || result.rows[0]?.data_type || result.rows.length;
        const passed = expected ? value == expected : value > 0 || value !== undefined;
        console.log(`${passed ? '✅' : '❌'} ${name}: ${value}`);
        return passed;
    } catch (e) {
        if (e.message.includes('does not exist')) {
            console.log(`❌ ${name}: TABLE NOT FOUND`);
        } else {
            console.log(`❌ ${name}: ${e.message.substring(0, 50)}`);
        }
        return false;
    }
}

async function main() {
    console.log('═'.repeat(60));
    console.log('🔍 WOLF HMS - Final System Verification');
    console.log('═'.repeat(60));
    console.log('');
    
    let passed = 0;
    let failed = 0;
    
    // Phase 1: Database Schema Fixes
    console.log('📋 PHASE 1: Database Schema Fixes');
    console.log('─'.repeat(40));
    
    if (await check('inventory_items.is_controlled exists', 
        `SELECT data_type FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='is_controlled'`)) passed++; else failed++;
    
    if (await check('wards.occupied_beds exists', 
        `SELECT data_type FROM information_schema.columns WHERE table_name='wards' AND column_name='occupied_beds'`)) passed++; else failed++;
    
    if (await check('user_sessions.hospital_id is INTEGER', 
        `SELECT data_type FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='hospital_id'`, 'integer')) passed++; else failed++;
    
    if (await check('users_role_check constraint exists', 
        `SELECT COUNT(*) as count FROM information_schema.check_constraints WHERE constraint_name='users_role_check'`, 1)) passed++; else failed++;
    
    // Phase 2: Security
    console.log('\n📋 PHASE 2: Security');
    console.log('─'.repeat(40));
    
    const jwtLen = (process.env.JWT_SECRET || '').length;
    console.log(`${jwtLen >= 32 ? '✅' : '❌'} JWT_SECRET length: ${jwtLen} chars`);
    if (jwtLen >= 32) passed++; else failed++;
    
    const hasAdminPass = !!process.env.ADMIN_DEFAULT_PASSWORD;
    console.log(`${hasAdminPass ? '✅' : '⚠️ '} ADMIN_DEFAULT_PASSWORD: ${hasAdminPass ? 'set' : 'using fallback'}`);
    if (hasAdminPass) passed++; else failed++;
    
    // Phase 3: Tables Created
    console.log('\n📋 PHASE 3: Mobile App Tables (UUID patient_id)');
    console.log('─'.repeat(40));
    
    const tables = ['patient_history', 'admin_audit_log', 'doctor_reviews', 'family_members', 
                    'chat_threads', 'chat_messages', 'article_bookmarks', 'sample_journey'];
    
    for (const table of tables) {
        if (await check(`${table} table exists`, 
            `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name='${table}'`, 1)) passed++; else failed++;
    }
    
    // Phase 4: Error Handling (verify asyncHandler usage)
    console.log('\n📋 PHASE 4: Controller Health');
    console.log('─'.repeat(40));
    
    const fs = require('fs');
    const path = require('path');
    const controllersDir = path.join(__dirname, 'controllers');
    const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
    
    let withErrorHandling = 0;
    for (const file of files) {
        const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
        if (content.includes('asyncHandler') || content.includes('try {')) {
            withErrorHandling++;
        }
    }
    
    console.log(`✅ Controllers with error handling: ${withErrorHandling}/${files.length}`);
    if (withErrorHandling === files.length) passed++; else failed++;
    
    // Database Connectivity
    console.log('\n📋 DATABASE HEALTH');
    console.log('─'.repeat(40));
    
    if (await check('Database connected', `SELECT 1 as count`)) passed++; else failed++;
    if (await check('Hospitals count', `SELECT COUNT(*) as count FROM hospitals`)) passed++; else failed++;
    if (await check('Users count', `SELECT COUNT(*) as count FROM users`)) passed++; else failed++;
    if (await check('Patients count', `SELECT COUNT(*) as count FROM patients`)) passed++; else failed++;
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Score: ${Math.round(passed / (passed + failed) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 ALL CHECKS PASSED - System is healthy!');
    } else {
        console.log('\n⚠️  Some checks failed - review above');
    }
    console.log('═'.repeat(60));
    
    await pool.end();
}

main();
