/**
 * Input Validation Schemas
 * Joi schemas for request validation
 */
const Joi = require('joi');

// Common validation helper
const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const errors = error.details.map(d => d.message);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }
    req.validatedBody = value;
    next();
};

// Auth schemas
const loginSchema = Joi.object({
    username: Joi.string().min(2).max(50).required(),
    password: Joi.string().min(4).max(100).required()
});

const registerSchema = Joi.object({
    username: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    role: Joi.string().valid('doctor', 'nurse', 'receptionist', 'lab', 'pharmacist', 'admin', 'blood_bank_tech', 'ward_incharge').required(),
    department: Joi.string().max(100).optional()
});

// Patient schemas
const patientSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    age: Joi.number().integer().min(0).max(150).required(),
    gender: Joi.string().valid('Male', 'Female', 'Other').required(),
    phone: Joi.string().max(20).required(),
    email: Joi.string().email().optional().allow(''),
    address: Joi.string().max(500).optional(),
    blood_group: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-').optional()
});

// Appointment schemas
const appointmentSchema = Joi.object({
    patient_id: Joi.string().uuid().required(),
    doctor_id: Joi.number().integer().required(),
    date: Joi.date().required(),
    time: Joi.string().required(),
    type: Joi.string().required(),
    reason: Joi.string().max(500).optional()
});

// Blood Bank schemas
const bloodRequestSchema = Joi.object({
    patient_id: Joi.string().uuid().required(),
    blood_group_required: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-').required(),
    component_type_id: Joi.number().integer().required(),
    units_required: Joi.number().integer().min(1).max(10).required(),
    priority: Joi.string().valid('Routine', 'Urgent', 'Emergency').required(),
    indication: Joi.string().max(500).required()
});

// ID param validation
const idParamSchema = Joi.object({
    id: Joi.alternatives().try(
        Joi.number().integer().positive(),
        Joi.string().uuid()
    ).required()
});

module.exports = {
    validate,
    schemas: {
        login: loginSchema,
        register: registerSchema,
        patient: patientSchema,
        appointment: appointmentSchema,
        bloodRequest: bloodRequestSchema,
        idParam: idParamSchema
    }
};
