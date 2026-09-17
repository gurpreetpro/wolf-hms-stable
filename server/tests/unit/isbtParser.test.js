/**
 * Unit tests for ISBT 128 Barcode Parser
 * Tests compliance with ICCBBA ST-001 ISBT 128 standards
 */
const { 
    parseISBT128, 
    isISBT128, 
    formatDINLabel,
    parseExpiryYYJJJ,
    BLOOD_GROUP_MAP, 
    PRODUCT_CODE_MAP 
} = require('../../utils/isbtParser');

describe('ISBT 128 Barcode Parser', () => {

    describe('Blood Group Decoding (RT016)', () => {
        it('should decode 4-digit ISBT ABO/Rh codes correctly', () => {
            expect(BLOOD_GROUP_MAP['0101']).toEqual({ abo: 'O', rh: 'Positive', label: 'O Positive' });
            expect(BLOOD_GROUP_MAP['0100']).toEqual({ abo: 'O', rh: 'Negative', label: 'O Negative' });
            expect(BLOOD_GROUP_MAP['0201']).toEqual({ abo: 'A', rh: 'Positive', label: 'A Positive' });
            expect(BLOOD_GROUP_MAP['0301']).toEqual({ abo: 'B', rh: 'Positive', label: 'B Positive' });
            expect(BLOOD_GROUP_MAP['0401']).toEqual({ abo: 'AB', rh: 'Positive', label: 'AB Positive' });
        });

        it('should decode shorthand ABO/Rh codes correctly', () => {
            expect(BLOOD_GROUP_MAP['5100']).toEqual({ abo: 'O', rh: 'Positive', label: 'O Positive' });
            expect(BLOOD_GROUP_MAP['5200']).toEqual({ abo: 'A', rh: 'Positive', label: 'A Positive' });
        });
    });

    describe('Product Code Mapping (RT017)', () => {
        it('should map standard product codes to blood components', () => {
            expect(PRODUCT_CODE_MAP['E0401'].name).toBe('Packed Red Blood Cells (PRBC)');
            expect(PRODUCT_CODE_MAP['E0401'].shelf_life_days).toBe(42);
            expect(PRODUCT_CODE_MAP['E0403'].name).toBe('Whole Blood');
            expect(PRODUCT_CODE_MAP['E0403'].shelf_life_days).toBe(35);
        });
    });

    describe('isISBT128() identification', () => {
        it('should recognize ISBT-128 barcode prefixes', () => {
            expect(isISBT128('=W12342412345600')).toBe(true);
            expect(isISBT128('=<E0401V00')).toBe(true);
            expect(isISBT128('NOT_ISBT')).toBe(false);
            expect(isISBT128('')).toBe(false);
        });
    });

    describe('parseISBT128()', () => {
        it('should parse Donation Identification Number (=DIN)', () => {
            const raw = '=W12342412345600';
            const parsed = parseISBT128(raw);
            expect(parsed).toBeDefined();
            expect(parsed.success).toBe(true);
            expect(parsed.din).toBeDefined();
            expect(parsed.din.facility_code).toBe('W');
        });

        it('should parse Product Code (=<PROD)', () => {
            const raw = '=<E0401V00';
            const parsed = parseISBT128(raw);
            expect(parsed).toBeDefined();
            expect(parsed.product_code).toBeDefined();
            expect(parsed.product_code.code).toBe('E0401');
            expect(parsed.product_code.name).toBe('Packed Red Blood Cells (PRBC)');
        });

        it('should parse Blood Group / Rh (=%BGR)', () => {
            const raw = '=%5100';
            const parsed = parseISBT128(raw);
            expect(parsed).toBeDefined();
            expect(parsed.blood_group).toBeDefined();
            expect(parsed.blood_group.abo).toBe('O');
            expect(parsed.blood_group.rh).toBe('Positive');
        });

        it('should parse Julian expiry dates via parseExpiryYYJJJ', () => {
            const expDate = parseExpiryYYJJJ('26150'); // Year 2026, Day 150
            expect(expDate).toBeInstanceOf(Date);
            expect(expDate.getFullYear()).toBe(2026);
        });
    });
});
