/**
 * eRaktKosh Integration Service
 * WOLF HMS - Phase 4: Indian Blood Bank Compliance
 * 
 * eRaktKosh is India's centralized blood bank management system
 * managed by NACO (National AIDS Control Organisation)
 * 
 * Features:
 * - Donor data sync
 * - Inventory sync
 * - Stock availability reporting
 * - ISBT 128 barcode support
 */

const db = require('../db');

// eRaktKosh API Configuration (placeholder - needs actual credentials)
const ERAKTKOSH_CONFIG = {
    baseUrl: process.env.ERAKTKOSH_URL || 'https://eraktkosh.in/BLDAHIMS/api',
    apiKey: process.env.ERAKTKOSH_API_KEY || '',
    bloodBankId: process.env.ERAKTKOSH_BB_ID || '',
    stateCode: process.env.ERAKTKOSH_STATE_CODE || 'KA', // Karnataka default
    enabled: process.env.ERAKTKOSH_ENABLED === 'true'
};

// NACO Standard Blood Group Codes
const BLOOD_GROUP_CODES = {
    'A+': { code: '01', name: 'A Positive' },
    'A-': { code: '02', name: 'A Negative' },
    'B+': { code: '03', name: 'B Positive' },
    'B-': { code: '04', name: 'B Negative' },
    'O+': { code: '05', name: 'O Positive' },
    'O-': { code: '06', name: 'O Negative' },
    'AB+': { code: '07', name: 'AB Positive' },
    'AB-': { code: '08', name: 'AB Negative' }
};

// ISBT 128 Component Codes
const ISBT_COMPONENT_CODES = {
    'WB': 'E0000000', // Whole Blood
    'PRBC': 'E0011000', // Packed Red Blood Cells
    'FFP': 'E0020000', // Fresh Frozen Plasma
    'PLT': 'E0030000', // Platelets
    'CRYO': 'E0040000'  // Cryoprecipitate
};

class ERaktKoshService {
    
    // ============================================
    // DATA FORMATTING
    // ============================================

    /**
     * Format donor data for eRaktKosh sync
     */
    static formatDonorForSync(donor) {
        return {
            donorId: donor.donor_id,
            name: donor.name,
            fatherName: donor.father_name || '',
            gender: donor.gender === 'Male' ? 'M' : donor.gender === 'Female' ? 'F' : 'O',
            dob: donor.date_of_birth,
            bloodGroup: BLOOD_GROUP_CODES[donor.blood_group]?.code || '00',
            mobileNo: donor.phone,
            email: donor.email || '',
            address: {
                line1: donor.address || '',
                city: donor.city || '',
                state: ERAKTKOSH_CONFIG.stateCode,
                pincode: donor.pincode || ''
            },
            weight: donor.weight,
            hemoglobin: donor.hemoglobin,
            isDonorDeferred: !donor.is_eligible,
            deferralReason: donor.deferral_reason || '',
            totalDonations: donor.total_donations,
            lastDonationDate: donor.last_donation_date,
            isVoluntary: donor.is_voluntary
        };
    }

    /**
     * Format blood unit for eRaktKosh sync
     */
    static formatUnitForSync(unit) {
        return {
            unitId: unit.unit_id,
            donorId: unit.donor_id,
            bloodGroup: BLOOD_GROUP_CODES[unit.blood_group]?.code || '00',
            componentCode: ISBT_COMPONENT_CODES[unit.component_code] || 'E0000000',
            componentName: unit.component_name,
            volumeMl: unit.volume_ml,
            collectionDate: unit.collection_date,
            expiryDate: unit.expiry_date,
            status: this.mapStatusToERaktKosh(unit.status),
            ttiStatus: unit.tested_status === 'Passed' ? 'NEGATIVE' : 
                       unit.tested_status === 'Failed' ? 'POSITIVE' : 'PENDING',
            ttiResults: {
                hiv: unit.tti_results?.hiv || 'Not Tested',
                hbsag: unit.tti_results?.hbsag || 'Not Tested',
                hcv: unit.tti_results?.hcv || 'Not Tested',
                vdrl: unit.tti_results?.vdrl || 'Not Tested',
                malaria: unit.tti_results?.malaria || 'Not Tested'
            },
            storageLocation: unit.storage_location,
            isbt128Barcode: this.generateISBT128(unit)
        };
    }

    /**
     * Map internal status to eRaktKosh status codes
     */
    static mapStatusToERaktKosh(status) {
        const statusMap = {
            'Quarantine': 'QRT',
            'Available': 'AVL',
            'Reserved': 'RSV',
            'Issued': 'ISS',
            'Transfused': 'TRF',
            'Discarded': 'DIS',
            'Expired': 'EXP'
        };
        return statusMap[status] || 'UNK';
    }

    /**
     * Generate ISBT 128 compliant barcode
     */
    static generateISBT128(unit) {
        // ISBT 128 format: =<FIN>001122<DIN>123456<Component><Blood Group>
        const fin = ERAKTKOSH_CONFIG.bloodBankId.padStart(6, '0');
        const din = String(unit.id).padStart(6, '0');
        const component = ISBT_COMPONENT_CODES[unit.component_code] || 'E0000000';
        const bloodGroup = BLOOD_GROUP_CODES[unit.blood_group]?.code || '00';
        
        return `=${fin}${din}${component}${bloodGroup}`;
    }

    // ============================================
    // SYNC OPERATIONS
    // ============================================

    /**
     * Get current inventory summary for eRaktKosh
     */
    static async getInventoryForSync() {
        try {
            const inventory = await db.pool.query(`
                SELECT 
                    bu.blood_group,
                    bct.code as component_code,
                    bct.name as component_name,
                    COUNT(*) as units_available,
                    SUM(bu.volume_ml) as total_volume
                FROM blood_units bu
                LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id
                WHERE bu.status = 'Available'
                    AND bu.tested_status = 'Passed'
                GROUP BY bu.blood_group, bct.code, bct.name
            `);

            return {
                bloodBankId: ERAKTKOSH_CONFIG.bloodBankId,
                syncTimestamp: new Date().toISOString(),
                inventory: inventory.rows.map(row => ({
                    bloodGroupCode: BLOOD_GROUP_CODES[row.blood_group]?.code,
                    bloodGroupName: row.blood_group,
                    componentCode: ISBT_COMPONENT_CODES[row.component_code],
                    componentName: row.component_name,
                    unitsAvailable: parseInt(row.units_available),
                    totalVolumeMl: parseInt(row.total_volume)
                }))
            };
        } catch (error) {
            console.error('Inventory sync error:', error);
            throw error;
        }
    }

    /**
     * Get donors for sync (newly registered or updated)
     */
    static async getDonorsForSync(since = null) {
        try {
            let query = `
                SELECT * FROM blood_donors
                WHERE is_eligible = true
            `;
            const params = [];
            
            if (since) {
                query += ` AND (created_at >= $1 OR updated_at >= $1)`;
                params.push(since);
            }
            
            query += ` ORDER BY created_at DESC LIMIT 100`;
            
            const donors = await db.pool.query(query, params);
            
            return {
                bloodBankId: ERAKTKOSH_CONFIG.bloodBankId,
                syncTimestamp: new Date().toISOString(),
                donors: donors.rows.map(d => this.formatDonorForSync(d))
            };
        } catch (error) {
            console.error('Donor sync error:', error);
            throw error;
        }
    }

    /**
     * Get units for sync
     */
    static async getUnitsForSync(since = null) {
        try {
            let query = `
                SELECT bu.*, bct.code as component_code, bct.name as component_name
                FROM blood_units bu
                LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id
                WHERE 1=1
            `;
            const params = [];
            
            if (since) {
                query += ` AND (bu.created_at >= $1 OR bu.updated_at >= $1)`;
                params.push(since);
            }
            
            query += ` ORDER BY bu.created_at DESC LIMIT 500`;
            
            const units = await db.pool.query(query, params);
            
            return {
                bloodBankId: ERAKTKOSH_CONFIG.bloodBankId,
                syncTimestamp: new Date().toISOString(),
                units: units.rows.map(u => this.formatUnitForSync(u))
            };
        } catch (error) {
            console.error('Unit sync error:', error);
            throw error;
        }
    }

    // ============================================
    // NACO COMPLIANCE REPORTS
    // ============================================

    /**
     * Generate NACO monthly report data
     */
    static async generateNACOReport(month, year) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            // Collections
            const collections = await db.pool.query(`
                SELECT 
                    blood_group,
                    COUNT(*) as total_collected,
                    SUM(CASE WHEN tested_status = 'Passed' THEN 1 ELSE 0 END) as passed_tti,
                    SUM(CASE WHEN tested_status = 'Failed' THEN 1 ELSE 0 END) as failed_tti
                FROM blood_units
                WHERE collection_date >= $1 AND collection_date <= $2
                GROUP BY blood_group
            `, [startDate, endDate]);

            // Transfusions
            const transfusions = await db.pool.query(`
                SELECT 
                    bu.blood_group,
                    COUNT(*) as total_transfused,
                    SUM(CASE WHEN bt.reaction_occurred THEN 1 ELSE 0 END) as with_reactions
                FROM blood_transfusions bt
                LEFT JOIN blood_units bu ON bt.unit_id = bu.id
                WHERE bt.start_time >= $1 AND bt.start_time <= $2
                GROUP BY bu.blood_group
            `, [startDate, endDate]);

            // Discards
            const discards = await db.pool.query(`
                SELECT 
                    blood_group,
                    COUNT(*) as total_discarded,
                    discard_reason
                FROM blood_units
                WHERE status = 'Discarded' AND discarded_at >= $1 AND discarded_at <= $2
                GROUP BY blood_group, discard_reason
            `, [startDate, endDate]);

            // TTI breakdown
            const ttiFailures = await db.pool.query(`
                SELECT 
                    tti_results->>'hiv' as hiv,
                    tti_results->>'hbsag' as hbsag,
                    tti_results->>'hcv' as hcv,
                    tti_results->>'vdrl' as vdrl,
                    tti_results->>'malaria' as malaria,
                    COUNT(*) as count
                FROM blood_units
                WHERE tested_status = 'Failed'
                    AND collection_date >= $1 AND collection_date <= $2
                GROUP BY tti_results
            `, [startDate, endDate]);

            return {
                reportType: 'NACO_MONTHLY',
                bloodBankId: ERAKTKOSH_CONFIG.bloodBankId,
                reportPeriod: {
                    month,
                    year,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                },
                collections: {
                    byBloodGroup: collections.rows,
                    total: collections.rows.reduce((sum, r) => sum + parseInt(r.total_collected), 0),
                    passedTTI: collections.rows.reduce((sum, r) => sum + parseInt(r.passed_tti), 0),
                    failedTTI: collections.rows.reduce((sum, r) => sum + parseInt(r.failed_tti), 0)
                },
                transfusions: {
                    byBloodGroup: transfusions.rows,
                    total: transfusions.rows.reduce((sum, r) => sum + parseInt(r.total_transfused), 0),
                    withReactions: transfusions.rows.reduce((sum, r) => sum + parseInt(r.with_reactions), 0)
                },
                discards: {
                    byReason: discards.rows,
                    total: discards.rows.reduce((sum, r) => sum + parseInt(r.total_discarded), 0)
                },
                ttiAnalysis: {
                    failures: ttiFailures.rows
                },
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('NACO report error:', error);
            throw error;
        }
    }

    // ============================================
    // STOCK AVAILABILITY (PUBLIC API)
    // ============================================

    /**
     * Get public stock availability (for eRaktKosh portal)
     */
    static async getPublicStockAvailability() {
        try {
            const stock = await db.pool.query(`
                SELECT 
                    blood_group,
                    COUNT(*) as units_available
                FROM blood_units
                WHERE status = 'Available'
                    AND tested_status = 'Passed'
                    AND expiry_date > CURRENT_DATE
                GROUP BY blood_group
            `);

            // Get hospital info from settings
            const hospital = await db.pool.query(`
                SELECT value FROM system_settings WHERE key = 'hospital_profile'
            `);
            const hospitalData = hospital.rows[0]?.value || {};

            return {
                bloodBankName: hospitalData.name || 'WOLF HMS Blood Bank',
                address: hospitalData.address || '',
                phone: hospitalData.phone || '',
                lastUpdated: new Date().toISOString(),
                availability: Object.keys(BLOOD_GROUP_CODES).map(group => {
                    const found = stock.rows.find(s => s.blood_group === group);
                    const units = found ? parseInt(found.units_available) : 0;
                    return {
                        bloodGroup: group,
                        bloodGroupCode: BLOOD_GROUP_CODES[group].code,
                        unitsAvailable: units,
                        status: units === 0 ? 'NOT_AVAILABLE' : units < 5 ? 'LOW' : 'AVAILABLE'
                    };
                })
            };
        } catch (error) {
            console.error('Stock availability error:', error);
            throw error;
        }
    }
}

module.exports = ERaktKoshService;
