/**
 * Master Data Cache
 * 
 * Caches frequently accessed master data:
 * - Drug list / Pharmacy inventory
 * - Lab test types
 * - Ward list
 * - Staff list
 */

const cache = require('../config/cache');
const { TTL, PREFIX } = cache;
const dbPools = require('../config/dbPools');

/**
 * Get cached drug list for a hospital
 */
const getDrugs = async (hospitalId) => {
    const key = cache.hospitalKey(hospitalId, 'drugs');
    
    return cache.getOrSet(key, async () => {
        const result = await dbPools.replicaPool.query(
            `SELECT id, name, generic_name, category, quantity_on_hand 
             FROM inventory_items 
             WHERE (hospital_id = $1) 
             AND quantity_on_hand > 0
             ORDER BY name`,
            [hospitalId]
        );
        return result.rows;
    }, TTL.MASTER_DATA);
};

/**
 * Get cached lab test types for a hospital
 */
const getLabTests = async (hospitalId) => {
    const key = cache.hospitalKey(hospitalId, 'tests');
    
    return cache.getOrSet(key, async () => {
        const result = await dbPools.replicaPool.query(
            `SELECT id, name, category, price, sample_type, turnaround_time
             FROM lab_test_types 
             WHERE (hospital_id = $1)
             ORDER BY name`,
            [hospitalId]
        );
        return result.rows;
    }, TTL.MASTER_DATA);
};

/**
 * Get cached ward list for a hospital
 */
const getWards = async (hospitalId) => {
    const key = cache.hospitalKey(hospitalId, 'wards');
    
    return cache.getOrSet(key, async () => {
        const result = await dbPools.replicaPool.query(
            `SELECT id, name, type, floor, total_beds 
             FROM wards 
             WHERE hospital_id = $1
             ORDER BY name`,
            [hospitalId]
        );
        return result.rows;
    }, TTL.MASTER_DATA);
};

/**
 * Get cached bed status for a ward (30s TTL for real-time dashboard)
 */
const getBedStatus = async (hospitalId, wardId) => {
    const key = `${PREFIX.BED}${hospitalId}:${wardId}`;
    
    return cache.getOrSet(key, async () => {
        const result = await dbPools.replicaPool.query(
            `SELECT b.id, b.bed_number, b.status, b.bed_type,
                    a.patient_id, p.name as patient_name
             FROM beds b
             LEFT JOIN admissions a ON b.id = a.bed_id AND a.status = 'Active'
             LEFT JOIN patients p ON a.patient_id = p.id
             WHERE b.ward_id = $1 AND b.hospital_id = $2
             ORDER BY b.bed_number`,
            [wardId, hospitalId]
        );
        return result.rows;
    }, TTL.BED_STATUS);
};

/**
 * Get all bed statuses for hospital (ward whiteboard)
 */
const getAllBedStatus = async (hospitalId) => {
    const key = `${PREFIX.BED}${hospitalId}:all`;
    
    return cache.getOrSet(key, async () => {
        const result = await dbPools.replicaPool.query(
            `SELECT w.name as ward_name, w.id as ward_id,
                    COUNT(*) as total_beds,
                    SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
                    SUM(CASE WHEN b.status = 'Reserved' THEN 1 ELSE 0 END) as reserved
             FROM beds b
             JOIN wards w ON b.ward_id = w.id
             WHERE b.hospital_id = $1
             GROUP BY w.id, w.name
             ORDER BY w.name`,
            [hospitalId]
        );
        return result.rows;
    }, TTL.BED_STATUS);
};

/**
 * Invalidate master data cache for a hospital
 */
const invalidateMasterData = async (hospitalId, type = 'all') => {
    if (type === 'all' || type === 'drugs') {
        await cache.del(cache.hospitalKey(hospitalId, 'drugs'));
    }
    if (type === 'all' || type === 'tests') {
        await cache.del(cache.hospitalKey(hospitalId, 'tests'));
    }
    if (type === 'all' || type === 'wards') {
        await cache.del(cache.hospitalKey(hospitalId, 'wards'));
    }
};

/**
 * Invalidate bed status cache (on admission/discharge/transfer)
 */
const invalidateBedStatus = async (hospitalId, wardId = null) => {
    await cache.del(`${PREFIX.BED}${hospitalId}:all`);
    if (wardId) {
        await cache.del(`${PREFIX.BED}${hospitalId}:${wardId}`);
    }
};

module.exports = {
    getDrugs,
    getLabTests,
    getWards,
    getBedStatus,
    getAllBedStatus,
    invalidateMasterData,
    invalidateBedStatus
};
