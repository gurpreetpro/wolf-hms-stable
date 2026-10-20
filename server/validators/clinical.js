const { z } = require('zod');

const emptyToNull = (val) => (val === '' || val === undefined ? null : val);

const logVitalsSchema = z.object({
    admission_id: z.union([z.string(), z.number()]).optional().nullable(),
    patient_id: z.string().uuid({ message: "Invalid patient ID format" }),
    user_id: z.union([z.string(), z.number()]).optional().nullable(),
    
    // Vitals can be strings or numbers in input, but we prefer strictness.
    // However, existing controller/service handled parsing. 
    // We will validate them as strings or numbers that can be coerced/validated.
    bp: z.preprocess(emptyToNull, z.string().regex(/^\d{2,3}\/\d{2,3}$/, { message: "BP must be in format '120/80'" }).optional().nullable()),
    
    // Allow string or number for these, but coerce to check constraints if necessary or just validate format
    temp: z.preprocess(emptyToNull, z.union([z.string(), z.number()]).refine((val) => {
        if (val === null || val === undefined) return true;
        const n = parseFloat(val);
        if (isNaN(n)) return false;
        const f = n < 45 ? (n * 9 / 5) + 32 : n;
        return f > 80 && f < 115;
    }, { message: "Temperature must be between 80F and 115F (or 27C and 46C)" }).optional().nullable()),

    spo2: z.preprocess(emptyToNull, z.union([z.string(), z.number()]).refine((val) => {
        if (val === null || val === undefined) return true;
        const n = parseInt(val);
        return !isNaN(n) && n >= 0 && n <= 100;
    }, { message: "SpO2 must be between 0 and 100" }).optional().nullable()),

    heart_rate: z.preprocess(emptyToNull, z.union([z.string(), z.number()]).refine((val) => {
        if (val === null || val === undefined) return true;
        const n = parseInt(val);
        return !isNaN(n) && n > 0 && n < 300;
    }, { message: "Heart Rate must be a valid positive number" }).optional().nullable()),
});

module.exports = {
    logVitalsSchema
};
