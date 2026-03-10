/**
 * Currency Utility for Indian Rupee (INR) formatting
 * Centralized currency handling for the HMS application
 */

// Currency symbol
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

/**
 * Format amount as Indian Rupees
 * Uses Indian numbering system (lakhs, crores)
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount, showSymbol = true) => {
    const num = parseFloat(amount) || 0;

    // Format with Indian locale (uses lakhs/crores separator pattern)
    const formatted = num.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });

    return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format currency with compact notation for large amounts
 * e.g., ₹1.5L, ₹2.3Cr
 */
export const formatCompact = (amount) => {
    const num = parseFloat(amount) || 0;

    if (num >= 10000000) { // 1 Crore
        return `₹${(num / 10000000).toFixed(1)}Cr`;
    } else if (num >= 100000) { // 1 Lakh
        return `₹${(num / 100000).toFixed(1)}L`;
    } else if (num >= 1000) {
        return `₹${(num / 1000).toFixed(1)}K`;
    }
    return `₹${num.toFixed(0)}`;
};

/**
 * Bed rates by ward type (per day in INR)
 */
export const BED_RATES = {
    'General': 1500,
    'Semi-Private': 3000,
    'Private': 5000,
    'ICU': 8000,
    'NICU': 10000,
    'Emergency': 3500,
    'Deluxe': 7500
};

/**
 * Calculate bed charges for a patient stay
 * @param {string} wardType - Type of ward
 * @param {Date|string} admissionDate - Date of admission
 * @param {Date|string} dischargeDate - Date of discharge (defaults to now)
 * @returns {object} Billing details
 */
export const calculateBedCharges = (wardType, admissionDate, dischargeDate = new Date()) => {
    const admission = new Date(admissionDate);
    const discharge = new Date(dischargeDate);

    // Calculate hours difference
    const diffMs = discharge - admission;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Calculate days (minimum 1 day, round up for partial days)
    const days = Math.max(1, Math.ceil(diffHours / 24));

    // Get rate per day
    const ratePerDay = BED_RATES[wardType] || BED_RATES['General'];

    // Calculate total
    const total = days * ratePerDay;

    return {
        wardType,
        ratePerDay,
        days,
        hours: Math.round(diffHours),
        total,
        formatted: formatCurrency(total),
        breakdown: `${wardType} Bed (${days} day${days > 1 ? 's' : ''}) @ ₹${ratePerDay.toLocaleString('en-IN')}/day`
    };
};

/**
 * Common service charges (in INR)
 */
export const SERVICE_CHARGES = {
    'Consultation - General': 500,
    'Consultation - Specialist': 1000,
    'Consultation - Senior': 1500,
    'Emergency Consultation': 2000,
    'X-Ray': 800,
    'CT Scan': 5000,
    'MRI': 12000,
    'Ultrasound': 1500,
    'Blood Test - Basic': 500,
    'Blood Test - Complete': 1200,
    'ECG': 400,
    'Nursing Care - Day': 1000,
    'Nursing Care - Night': 1200
};

export default {
    CURRENCY_SYMBOL,
    CURRENCY_CODE,
    formatCurrency,
    formatCompact,
    BED_RATES,
    calculateBedCharges,
    SERVICE_CHARGES
};
