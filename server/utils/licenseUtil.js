const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Secret Key for signing (In production, this should be hidden/obfuscated)
const SECRET = 'ANTIGRAVITY-HMS-SUPER-SECRET-KEY-2025';

// Generate License Key
// Format: HMS-{HOSPITAL_ID}-{EXPIRY_TIMESTAMP}-{SIGNATURE}
const generateLicense = (hospitalName, expiryDate) => {
    const expiry = new Date(expiryDate).getTime();
    const payload = `${hospitalName}|${expiry}`;
    const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').substring(0, 16).toUpperCase();

    // Base64 encode the payload to make it look like a key
    const encodedPayload = Buffer.from(payload).toString('base64').replace(/=/g, '');

    return `HMS-${encodedPayload}-${signature}`;
};

// Verify License Key
const verifyLicense = (key) => {
    try {
        const parts = key.split('-');
        if (parts.length !== 3 || parts[0] !== 'HMS') return { valid: false, message: 'Invalid Format' };

        const encodedPayload = parts[1];
        const signature = parts[2];

        const payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
        const [hospitalName, expiry] = payload.split('|');

        // Re-create signature
        const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').substring(0, 16).toUpperCase();

        if (signature !== expectedSignature) return { valid: false, message: 'Invalid Signature' };

        if (Date.now() > parseInt(expiry)) return { valid: false, message: 'License Expired' };

        return { valid: true, hospitalName, expiry: new Date(parseInt(expiry)) };
    } catch (err) {
        return { valid: false, message: 'Verification Error' };
    }
};

// Check if license file exists and is valid
const checkLicenseFile = () => {
    const licensePath = path.join(__dirname, '../license.key');
    if (!fs.existsSync(licensePath)) return { valid: false, message: 'No License Found' };

    const key = fs.readFileSync(licensePath, 'utf8').trim();
    return verifyLicense(key);
};

module.exports = { generateLicense, verifyLicense, checkLicenseFile };
