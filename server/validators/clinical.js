const { z } = require('zod');

const logVitalsSchema = z.object({
    admission_id: z.number().int().optional().nullable(),
    patient_id: z.string().uuid({ message: "Invalid patient ID format" }),
    user_id: z.number().int({ message: "User ID must be an integer" }).optional(),
    
    // Vitals can be strings or numbers in input, but we prefer strictness.
    // However, existing controller/service handled parsing. 
    // We will validate them as strings or numbers that can be coerced/validated.
    bp: z.string().regex(/^\d{2,3}\/\d{2,3}$/, { message: "BP must be in format '120/80'" }).optional().nullable(),
    
    // Allow string or number for these, but coerce to check constraints if necessary or just validate format
    temp: z.union([z.string(), z.number()]).refine((val) => {
        const n = parseFloat(val);
        return !isNaN(n) && n > 80 && n < 115;
    }, { message: "Temperature must be between 80F and 115F" }).optional().nullable(),

    spo2: z.union([z.string(), z.number()]).refine((val) => {
        const n = parseInt(val);
        return !isNaN(n) && n >= 0 && n <= 100;
    }, { message: "SpO2 must be between 0 and 100" }).optional().nullable(),

    heart_rate: z.union([z.string(), z.number()]).refine((val) => {
        const n = parseInt(val);
        return !isNaN(n) && n > 0 && n < 300;
    }, { message: "Heart Rate must be a valid positive number" }).optional().nullable(),
});

module.exports = {
    logVitalsSchema
};
