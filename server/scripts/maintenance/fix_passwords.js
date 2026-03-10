const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function fixUserPasswords() {
    try {
        console.log('\n=== Fixing User Passwords ===\n');
        console.log('Generating bcrypt hash for "password123"...\n');

        // Generate a proper bcrypt hash for 'password123'
        const password = 'password123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log('Generated hash:', hashedPassword);
        console.log('\nUpdating all users with correct password hash...\n');

        // Update all users with the correct hash
        const result = await pool.query(
            'UPDATE users SET password = $1 RETURNING username, email, role',
            [hashedPassword]
        );

        console.log(`Updated ${result.rows.length} users:\n`);
        result.rows.forEach(u => {
            console.log(`  ✓ ${u.username.padEnd(20)} | ${u.email.padEnd(25)} | ${u.role}`);
        });

        console.log('\n=== Password Fix Complete ===');
        console.log('\nAll users can now login with:');
        console.log('  Password: password123\n');

        // Verify by attempting to compare
        console.log('Verifying hash...');
        const isValid = await bcrypt.compare('password123', hashedPassword);
        console.log('Hash verification:', isValid ? '✓ VALID' : '✗ INVALID');

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('\n✗ Error:', err.message);
        process.exit(1);
    }
}

fixUserPasswords();
