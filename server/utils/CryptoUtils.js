/**
 * WolfGuard Crypto Utilities
 * Enterprise Grade AES-256-GCM Encryption for Database Secrets
 */

const crypto = require('crypto');

// Algorithm: AES-256-GCM (Authenticated Encryption)
// Key Length: 32 bytes (256 bits)
// IV Length: 16 bytes (128 bits) - standard for GCM
// Auth Tag Length: 16 bytes (128 bits)

const ALGORITHM = 'aes-256-gcm';

// Derive or load master key from env
// In prod, use a KMS. For MVP, use a strong env var.
const getMasterKey = () => {
    const secret = process.env.WOLF_VAULT_KEY || 'default-wolf-hms-256-bit-secre-key!!';
    // Ensure 32 bytes
    return crypto.scryptSync(secret, 'salt', 32); 
};

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {Object} { encryptedData, iv, authTag } - All in hex
 */
const encrypt = (text) => {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
};

/**
 * Decrypts data using AES-256-GCM
 * @param {string} encryptedData - Hex string
 * @param {string} iv - Hex string
 * @param {string} authTag - Hex string
 * @returns {string} Plain text
 */
const decrypt = (encryptedData, iv, authTag) => {
    if (!encryptedData || !iv || !authTag) return null;

    try {
        const key = getMasterKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
        
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[CryptoUtils] Decryption Failed:', error.message);
        // Return null or throw custom error depending on security posture.
        // Returning null prevents crashing but might mask attack.
        return null;
    }
};

module.exports = {
    encrypt,
    decrypt
};
