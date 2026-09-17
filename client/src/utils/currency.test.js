import { describe, it, expect } from 'vitest';
import { 
    formatCurrency, 
    formatCompact, 
    calculateBedCharges, 
    BED_RATES, 
    CURRENCY_SYMBOL 
} from './currency';

describe('Currency & Bed Charge Utility (INR)', () => {
    describe('formatCurrency()', () => {
        it('should format amounts with Indian numbering system and symbol', () => {
            expect(formatCurrency(1500)).toContain('1,500');
            expect(formatCurrency(1500)).toContain(CURRENCY_SYMBOL);
            expect(formatCurrency(150000)).toContain('1,50,000');
        });

        it('should handle zero or non-numeric input gracefully', () => {
            expect(formatCurrency(0)).toContain('0');
            expect(formatCurrency('abc')).toContain('0');
        });

        it('should omit currency symbol when showSymbol is false', () => {
            const formatted = formatCurrency(5000, false);
            expect(formatted).not.toContain(CURRENCY_SYMBOL);
            expect(formatted).toContain('5,000');
        });
    });

    describe('formatCompact()', () => {
        it('should format large amounts in Lakhs and Crores notation', () => {
            expect(formatCompact(100000)).toBe('₹1.0L');
            expect(formatCompact(10000000)).toBe('₹1.0Cr');
            expect(formatCompact(5000)).toBe('₹5.0K');
        });
    });

    describe('calculateBedCharges()', () => {
        it('should calculate bed charges based on ward rate and days stayed', () => {
            const admission = new Date('2026-09-01T10:00:00Z');
            const discharge = new Date('2026-09-04T10:00:00Z'); // 3 full days

            const charges = calculateBedCharges('ICU', admission, discharge);
            expect(charges.wardType).toBe('ICU');
            expect(charges.ratePerDay).toBe(BED_RATES['ICU']);
            expect(charges.days).toBe(3);
            expect(charges.total).toBe(3 * BED_RATES['ICU']);
        });

        it('should charge minimum 1 day for same-day stays', () => {
            const admission = new Date('2026-09-01T10:00:00Z');
            const discharge = new Date('2026-09-01T14:00:00Z'); // 4 hours

            const charges = calculateBedCharges('General', admission, discharge);
            expect(charges.days).toBe(1);
            expect(charges.total).toBe(BED_RATES['General']);
        });
    });
});
