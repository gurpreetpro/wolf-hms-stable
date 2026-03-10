// Wolf HMS Centralized Constants
// Purpose: Store hardcoded values, thresholds, and configuration settings in one place.

const VITALS_THRESHOLDS = {
    HEART_RATE: {
        CRITICAL_HIGH: 120,
        CRITICAL_LOW: 40,
        ABNORMAL_HIGH: 100,
        ABNORMAL_LOW: 50,
        UNIT: 'bpm'
    },
    SPO2: {
        CRITICAL_LOW: 90,
        LOW: 95,
        UNIT: '%'
    },
    TEMP: {
        CRITICAL_HIGH: 102,
        CRITICAL_LOW: 95,
        UNIT: '°F'
    }
};

const LAB_CONSTANTS = {
    DEFAULT_PRIORITY: 'Routine',
    STATUS: {
        PENDING: 'Pending',
        SAMPLE_COLLECTED: 'Sample Collected',
        COMPLETED: 'Completed',
        VERIFIED: 'Verified',
        AMENDED: 'Amended'
    },
    BARCODE_PREFIX: 'LAB'
};

const BILLING_CONSTANTS = {
    DEFAULT_CURRENCY: 'INR',
    TAX_RATE: 0.18, // 18% GST default
    PAYMENT_METHODS: ['Cash', 'Card', 'UPI', 'Insurance']
};

const SECURITY_CONSTANTS = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    TOKEN_EXPIRY: '24h'
};

module.exports = {
    VITALS_THRESHOLDS,
    LAB_CONSTANTS,
    BILLING_CONSTANTS,
    SECURITY_CONSTANTS
};
