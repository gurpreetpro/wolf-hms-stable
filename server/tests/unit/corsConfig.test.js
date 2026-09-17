/**
 * corsConfig.test.js — Unit Tests for CORS Allowlist Configuration & Validation
 */

const { isOriginAllowed, parseAllowedOrigins } = require('../../config/secrets');

describe('CORS Configuration & Origin Validation (Phase 2)', () => {
    test('should parse comma-separated allowed origins correctly', () => {
        const parsed = parseAllowedOrigins('http://example.com, https://wolf-hms.com/ , http://localhost:3000');
        expect(parsed).toEqual([
            'http://example.com',
            'https://wolf-hms.com',
            'http://localhost:3000'
        ]);
    });

    test('should fall back to default production and local origins if unset', () => {
        const parsed = parseAllowedOrigins(undefined);
        expect(parsed).toContain('http://185.213.27.158');
        expect(parsed).toContain('http://localhost:5173');
        expect(parsed).toContain('http://localhost:3000');
        expect(parsed).not.toContain('*');
    });

    test('should allow requests with no Origin header (same-origin / server-to-server)', () => {
        expect(isOriginAllowed(undefined)).toBe(true);
        expect(isOriginAllowed('')).toBe(true);
    });

    test('should permit configured origins', () => {
        expect(isOriginAllowed('http://185.213.27.158')).toBe(true);
        expect(isOriginAllowed('http://localhost:5173')).toBe(true);
        expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    });

    test('should reject untrusted third-party origins', () => {
        expect(isOriginAllowed('http://malicious-site.com')).toBe(false);
        expect(isOriginAllowed('https://evil-attacker.org')).toBe(false);
        expect(isOriginAllowed('http://185.213.27.158.fake.domain')).toBe(false);
    });
});
