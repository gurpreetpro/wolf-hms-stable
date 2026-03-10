/**
 * Input Validation Middleware
 * Lightweight validation without external dependencies
 */

// Validation helper functions
const validators = {
    isUUID: (value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    },
    isEmail: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },
    isPhone: (value) => {
        const phoneRegex = /^[\d\s\-+()]{10,15}$/;
        return phoneRegex.test(value);
    },
    isNotEmpty: (value) => {
        return value !== undefined && value !== null && String(value).trim() !== '';
    },
    isNumber: (value) => {
        return !isNaN(value) && isFinite(value);
    },
    isPositive: (value) => {
        return validators.isNumber(value) && Number(value) > 0;
    },
    isIn: (value, allowed) => {
        return allowed.includes(value);
    },
    minLength: (value, min) => {
        return String(value).length >= min;
    },
    maxLength: (value, max) => {
        return String(value).length <= max;
    }
};

// Validation schemas for common operations
const schemas = {
    // Patient registration
    patientRegistration: {
        name: { required: true, minLength: 2, maxLength: 100 },
        phone: { validator: 'isPhone' },
        gender: { allowed: ['Male', 'Female', 'Other'] }
    },

    // Admission
    admission: {
        patient_id: { required: true, validator: 'isUUID' },
        ward: { required: true }, // [FIX] Removed hardcoded list to allow dynamic ward names
        bed_number: { required: true, minLength: 1 }
    },

    // Vitals logging
    vitals: {
        admission_id: { required: true, validator: 'isNumber' },
        bp: { maxLength: 20 },
        temp: { validator: 'isNumber' },
        spo2: { validator: 'isNumber' },
        heart_rate: { validator: 'isNumber' }
    },

    // Lab request
    labRequest: {
        patient_id: { required: true, validator: 'isUUID' },
        test_name: { required: true, minLength: 2 }
    },

    // User login
    login: {
        // Allow either username or id (handled in controller, here just loose validation or ensure at least one)
        // For simplicity in this middleware, we'll validate password and ensure username/id is handled safely.
        // Actually, let's just allow 'id' to pass through.
        password: { required: true, minLength: 4 }
    }
};

/**
 * Validate a single field against rules
 */
const validateField = (value, rules, fieldName) => {
    const errors = [];

    // Required check
    if (rules.required && !validators.isNotEmpty(value)) {
        errors.push(`${fieldName} is required`);
        return errors; // Skip other validations if required field is empty
    }

    // Skip validation if field is optional and empty
    if (!validators.isNotEmpty(value)) {
        return errors;
    }

    // Validator function check
    if (rules.validator && validators[rules.validator]) {
        if (!validators[rules.validator](value)) {
            errors.push(`${fieldName} is invalid`);
        }
    }

    // Allowed values check
    if (rules.allowed && !validators.isIn(value, rules.allowed)) {
        errors.push(`${fieldName} must be one of: ${rules.allowed.join(', ')}`);
    }

    // Min length check
    if (rules.minLength && !validators.minLength(value, rules.minLength)) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    // Max length check
    if (rules.maxLength && !validators.maxLength(value, rules.maxLength)) {
        errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }

    return errors;
};

/**
 * Create validation middleware for a specific schema
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];

        if (!schema) {
            console.error(`Validation schema '${schemaName}' not found`);
            return next(); // Skip validation if schema doesn't exist
        }

        const allErrors = [];

        for (const [fieldName, rules] of Object.entries(schema)) {
            const value = req.body[fieldName];
            const fieldErrors = validateField(value, rules, fieldName);
            allErrors.push(...fieldErrors);
        }

        if (allErrors.length > 0) {
            console.error(`❌ Validation Failed for ${schemaName}:`, {
                body: req.body,
                errors: allErrors
            });
            return res.status(400).json({
                message: 'Validation failed',
                errors: allErrors
            });
        }

        next();
    };
};

/**
 * Sanitize input - remove potentially dangerous characters
 */
const sanitize = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remove null bytes and trim
            return value.replace(/\0/g, '').trim();
        }
        return value;
    };

    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        const sanitized = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = sanitizeValue(value);
            }
        }
        return sanitized;
    };

    req.body = sanitizeObject(req.body);
    next();
};

module.exports = { validate, sanitize, validators, schemas };
