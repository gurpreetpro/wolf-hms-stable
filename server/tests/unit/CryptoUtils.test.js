/**
 * Unit tests for AES-256-GCM Crypto Utilities
 */
const { encrypt, decrypt } = require('../../utils/CryptoUtils');

describe('CryptoUtils (AES-256-GCM)', () => {
    it('should encrypt and decrypt plaintext symmetrically', () => {
        const secret = 'Patient-Aadhaar-1234-5678-9012';
        const encrypted = encrypt(secret);

        expect(encrypted).toBeDefined();
        expect(encrypted.encryptedData).toBeDefined();
        expect(encrypted.iv).toHaveLength(32); // 16 bytes in hex
        expect(encrypted.authTag).toHaveLength(32); // 16 bytes in hex

        const decrypted = decrypt(encrypted.encryptedData, encrypted.iv, encrypted.authTag);
        expect(decrypted).toBe(secret);
    });

    it('should return null when encrypting falsy input', () => {
        expect(encrypt(null)).toBeNull();
        expect(encrypt('')).toBeNull();
        expect(encrypt(undefined)).toBeNull();
    });

    it('should return null when decrypting missing parameters', () => {
        expect(decrypt(null, 'iv', 'tag')).toBeNull();
        expect(decrypt('data', null, 'tag')).toBeNull();
        expect(decrypt('data', 'iv', null)).toBeNull();
    });

    it('should fail cleanly when authTag is corrupted (tampering prevention)', () => {
        const secret = 'Confidential Patient Diagnosis';
        const encrypted = encrypt(secret);

        // Tamper with ciphertext
        const corruptedTag = '0'.repeat(32);
        const decrypted = decrypt(encrypted.encryptedData, encrypted.iv, corruptedTag);
        expect(decrypted).toBeNull();
    });
});
