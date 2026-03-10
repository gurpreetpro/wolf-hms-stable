const crypto = require('crypto');
const readline = require('readline');

// Secret Key (Must match the server's key)
const SECRET = 'ANTIGRAVITY-HMS-SUPER-SECRET-KEY-2025';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔑 HMS Premium - License Key Generator');
console.log('--------------------------------------');

rl.question('Enter Hospital Name: ', (hospitalName) => {
    rl.question('Enter Validity (Days): ', (days) => {
        const expiryDate = new Date(Date.now() + (parseInt(days) * 24 * 60 * 60 * 1000));
        const expiry = expiryDate.getTime();

        const payload = `${hospitalName}|${expiry}`;
        const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').substring(0, 16).toUpperCase();

        // Base64 encode the payload
        const encodedPayload = Buffer.from(payload).toString('base64').replace(/=/g, '');

        const licenseKey = `HMS-${encodedPayload}-${signature}`;

        console.log('\n✅ Generated License Key:');
        console.log('--------------------------------------');
        console.log(licenseKey);
        console.log('--------------------------------------');
        console.log(`Expires on: ${expiryDate.toLocaleString()}`);

        rl.close();
    });
});
