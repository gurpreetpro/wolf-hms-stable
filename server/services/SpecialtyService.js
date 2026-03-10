const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SpecialtyService {

    // --- ONCOLOGY: CHEMOTHERAPY ---

    /**
     * Start a new Chemotherapy Cycle
     * @param {string} patientId 
     * @param {string} regimenName 
     * @param {Date} startDate 
     * @param {number} totalCycles 
     */
    async initiateChemoRegimen(patientId, regimenName, startDate, totalCycles) {
        // Create Cycle 1
        const cycle = await prisma.chemo_cycles.create({
            data: {
                patient_id: patientId,
                regimen_name: regimenName,
                cycle_number: 1,
                total_cycles: totalCycles,
                start_date: startDate,
                status: 'Active'
            }
        });

        // Auto-schedule sessions (Example: Day 1, Day 8, Day 15)
        // In real app, this would be configurable per regimen
        const schedule = [1, 8, 15];
        for (const day of schedule) {
            const sessionDate = new Date(startDate);
            sessionDate.setDate(sessionDate.getDate() + (day - 1));
            
            await prisma.chemo_sessions.create({
                data: {
                    cycle_id: cycle.id,
                    day_number: day,
                    scheduled_date: sessionDate,
                    status: 'Scheduled'
                }
            });
        }

        return cycle;
    }

    /**
     * Record Administration of Chemo Drugs
     * @param {number} sessionId 
     * @param {object} drugs - { "drugA": "dosage", "drugB": "dosage" }
     * @param {number} userId 
     */
    async administerChemoSession(sessionId, drugs, userId) {
        return await prisma.chemo_sessions.update({
            where: { id: sessionId },
            data: {
                status: 'Administered',
                administered_date: new Date(),
                drugs_administered: drugs,
                administered_by: userId
            }
        });
    }

    // --- NEPHROLOGY: DIALYSIS ---

    /**
     * Start a Dialysis Session
     * @param {string} patientId 
     * @param {number} hospitalId 
     * @param {number} userId 
     */
    async startDialysisSession(patientId, hospitalId, userId) {
        return await prisma.dialysis_sessions.create({
            data: {
                patient_id: patientId,
                hospital_id: hospitalId,
                session_date: new Date(),
                start_time: new Date(),
                status: 'In-Progress',
                performed_by: userId,
                // Init with placeholder pre-weight
                pre_weight: 0.00 
            }
        });
    }

    /**
     * Complete Session with IoT Data
     * @param {number} sessionId 
     * @param {object} metrics 
     */
    async completeDialysisSession(sessionId, metrics) {
        return await prisma.dialysis_sessions.update({
            where: { id: sessionId },
            data: {
                end_time: new Date(),
                status: 'Completed',
                pre_weight: metrics.pre_weight,
                post_weight: metrics.post_weight,
                fluid_removed: metrics.fluid_removed,
                blood_flow_rate: metrics.blood_flow_rate,
                dialysate_flow: metrics.dialysate_flow,
                kt_v: metrics.kt_v
            }
        });
    }
}

module.exports = new SpecialtyService();
