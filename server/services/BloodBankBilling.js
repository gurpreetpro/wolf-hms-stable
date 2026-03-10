/**
 * Blood Bank Billing Service
 * WOLF HMS - Phase 5: Pricing & Billing Integration
 * 
 * Features:
 * - Calculate transfusion charges
 * - Apply NACO exemptions
 * - Integrate with invoice system
 */

const db = require('../db');
const { addToInvoice } = require('./billingService');

// Get hospital type from settings (govt/private)
const getHospitalType = async () => {
    try {
        const result = await db.pool.query(
            "SELECT value FROM system_settings WHERE key = 'hospital_profile'"
        );
        const profile = result.rows[0]?.value || {};
        return profile.hospital_type || 'private';
    } catch (error) {
        console.error('Get hospital type error:', error);
        return 'private'; // Default to private (higher fees)
    }
};

// Check if patient has exempt condition
const checkExemption = async (patientId) => {
    try {
        // Check patient's medical history for exempt conditions
        const patient = await db.pool.query(
            'SELECT history_json FROM patients WHERE id = $1',
            [patientId]
        );
        
        if (!patient.rows[0]) return { exempt: false };
        
        const history = patient.rows[0].history_json || {};
        const conditions = history.chronic_conditions || [];
        
        // Get all exempt condition codes
        const exemptions = await db.pool.query(
            'SELECT condition_code, condition_name FROM blood_exempt_conditions WHERE is_active = true'
        );
        
        for (const exemption of exemptions.rows) {
            const code = exemption.condition_code.toLowerCase();
            if (conditions.some(c => c.toLowerCase().includes(code))) {
                return { 
                    exempt: true, 
                    reason: exemption.condition_name,
                    naco_mandate: true
                };
            }
        }
        
        return { exempt: false };
    } catch (error) {
        console.error('Check exemption error:', error);
        return { exempt: false };
    }
};

// Get component pricing
const getComponentPricing = async (componentTypeId) => {
    try {
        const result = await db.pool.query(
            'SELECT govt_processing_fee, private_processing_fee FROM blood_component_types WHERE id = $1',
            [componentTypeId]
        );
        return result.rows[0] || { govt_processing_fee: 0, private_processing_fee: 0 };
    } catch (error) {
        console.error('Get component pricing error:', error);
        return { govt_processing_fee: 0, private_processing_fee: 0 };
    }
};

// Get service charge
const getServiceCharge = async (serviceCode, hospitalType = 'private') => {
    try {
        const result = await db.pool.query(
            'SELECT govt_fee, private_fee FROM blood_service_charges WHERE service_code = $1 AND is_active = true',
            [serviceCode]
        );
        if (result.rows[0]) {
            return hospitalType === 'govt' ? result.rows[0].govt_fee : result.rows[0].private_fee;
        }
        return 0;
    } catch (error) {
        console.error('Get service charge error:', error);
        return 0;
    }
};

/**
 * Bill a transfusion or blood issue
 * @param {Object} params - Billing parameters
 * @param {number|null} params.transfusionId - Transfusion record ID (optional if billing at issue)
 * @param {number} params.unitId - Blood unit ID
 * @param {string} params.patientId - Patient UUID
 * @param {number} params.admissionId - Admission ID (if admitted)
 * @param {number} params.componentTypeId - Component type ID
 * @param {string[]} params.additionalServices - Service codes (e.g., ['XMATCH', 'LEUKOFILT'])
 * @param {number} params.userId - User creating the bill
 */
const billTransfusion = async (params) => {
    const {
        transfusionId = null, unitId, patientId, admissionId,
        componentTypeId, additionalServices = [], userId
    } = params;
    
    try {
        // 1. Check exemption
        const exemption = await checkExemption(patientId);
        
        // 2. Get hospital type
        const hospitalType = await getHospitalType();
        
        // 3. Get component pricing
        const pricing = await getComponentPricing(componentTypeId);
        const componentFee = hospitaType === 'govt' 
            ? parseFloat(pricing.govt_processing_fee) 
            : parseFloat(pricing.private_processing_fee);
        
        // 4. Get additional service fees
        const serviceFees = {};
        let totalServiceFee = 0;
        for (const serviceCode of additionalServices) {
            const fee = await getServiceCharge(serviceCode, hospitalType);
            serviceFees[serviceCode] = fee;
            totalServiceFee += parseFloat(fee);
        }
        
        // 5. Calculate total
        let totalAmount = componentFee + totalServiceFee;
        
        // 6. Apply exemption if applicable
        if (exemption.exempt) {
            totalAmount = 0;
        }
        
        // 7. Add to invoice (if not exempt or partial billing needed)
        let invoiceId = null;
        if (totalAmount > 0) {
            // Get component name for description
            const component = await db.pool.query(
                'SELECT name, code FROM blood_component_types WHERE id = $1',
                [componentTypeId]
            );
            const componentName = component.rows[0]?.name || 'Blood Component';
            
            // Get unit blood group
            const unit = await db.pool.query(
                'SELECT blood_group FROM blood_units WHERE id = $1',
                [unitId]
            );
            const bloodGroup = unit.rows[0]?.blood_group || '';
            
            invoiceId = await addToInvoice(
                patientId,
                admissionId,
                `Blood: ${componentName} (${bloodGroup}) - Processing Fee`,
                1,
                componentFee,
                userId
            );
            
            // Add service charges as separate line items
            for (const [code, fee] of Object.entries(serviceFees)) {
                if (fee > 0) {
                    await addToInvoice(
                        patientId,
                        admissionId,
                        `Blood Bank: ${code}`,
                        1,
                        fee,
                        userId
                    );
                }
            }
        }
        
        // 8. Log billing
        await db.pool.query(`
            INSERT INTO blood_billing_log (
                transfusion_id, unit_id, patient_id, invoice_id,
                component_fee, service_fees, total_amount,
                is_exempt, exemption_reason, billed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            transfusionId, unitId, patientId, invoiceId,
            componentFee, JSON.stringify(serviceFees), totalAmount,
            exemption.exempt, exemption.reason || null, userId
        ]);
        
        return {
            success: true,
            invoiceId,
            componentFee,
            serviceFees,
            totalAmount,
            isExempt: exemption.exempt,
            exemptionReason: exemption.reason
        };
    } catch (error) {
        console.error('Bill transfusion error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get pricing list for display
 */
const getPricingList = async () => {
    try {
        const hospitalType = await getHospitalType();
        const feeColumn = hospitalType === 'govt' ? 'govt_processing_fee' : 'private_processing_fee';
        
        // Component prices
        const components = await db.pool.query(`
            SELECT id, code, name, ${feeColumn} as fee
            FROM blood_component_types
            WHERE is_active = true
            ORDER BY id
        `);
        
        // Service prices
        const serviceFeeColumn = hospitalType === 'govt' ? 'govt_fee' : 'private_fee';
        const services = await db.pool.query(`
            SELECT id, service_code, service_name, ${serviceFeeColumn} as fee
            FROM blood_service_charges
            WHERE is_active = true
            ORDER BY id
        `);
        
        // Exemptions
        const exemptions = await db.pool.query(`
            SELECT condition_code, condition_name, naco_mandate
            FROM blood_exempt_conditions
            WHERE is_active = true
        `);
        
        return {
            hospitalType,
            components: components.rows,
            services: services.rows,
            exemptions: exemptions.rows,
            note: 'Prices are processing fees only (NACO 2024 guidelines). Blood itself is free.'
        };
    } catch (error) {
        console.error('Get pricing list error:', error);
        throw error;
    }
};

module.exports = {
    billTransfusion,
    getPricingList,
    checkExemption,
    getComponentPricing,
    getServiceCharge,
    getHospitalType
};
