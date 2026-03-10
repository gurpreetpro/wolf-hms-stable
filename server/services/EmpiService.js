const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

/**
 * Enterprise Master Patient Index (EMPI) Service
 * Handles probabilistic matching and global identity management.
 */
class EmpiService {
  
  /**
   * Generate a deterministic hash for phone/DOB/Gender combination
   * Used for blocking/indexing potential matches
   */
  generatePhoneHash(phone, dob, gender) {
    const raw = `${phone}-${dob.toISOString().split('T')[0]}-${gender}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Calculate similarity score between two strings using basic Levenshtein (simplified)
   * In production, this would use pg_trgm in the DB layer for speed.
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1.0;
    
    // Simple containment check as placeholder for full Levenshtein
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    return 0.0;
  }

  /**
   * Find or Create a Global Master Identity
   * @param {Object} patient - Local patient object
   * @param {number} hospitalId - ID of the hospital
   */
  async processPatientRegistration(patient, hospitalId) {
    console.log(`[EMPI] Processing registration for: ${patient.first_name} ${patient.last_name}`);
    
    const phoneHash = this.generatePhoneHash(patient.phone, patient.date_of_birth, patient.gender);

    // 1. Exact Match Check (High Confidence)
    let master = await prisma.master_identities.findUnique({
      where: { phone_hash: phoneHash }
    });

    if (master) {
      console.log(`[EMPI] Exact match found (Master ID: ${master.id})`);
      await this.linkPatientToMaster(master.id, patient.id, hospitalId, 1.0);
      return { masterId: master.id, type: 'MATCH_EXACT' };
    }

    // 2. Fuzzy Match Check (Medium Confidence)
    // Using simple database query for name + partial phone matches
    // In full implementation, this uses pg_trgm similarity()
    const potentialMatches = await prisma.master_identities.findMany({
      where: {
        OR: [
          { last_name: { equals: patient.last_name, mode: 'insensitive' } },
          { phone_hash: { contains: patient.phone } } // Partial match if hash logic allowed it, but here strict
        ]
      }
    });

    // Filter potential matches in memory (for now)
    let bestMatch = null;
    let highestScore = 0;

    for (const candidate of potentialMatches) {
        const nameScore = this.calculateSimilarity(candidate.first_name, patient.first_name);
        if (nameScore > 0.8) {
            bestMatch = candidate;
            highestScore = nameScore;
        }
    }

    if (bestMatch && highestScore > 0.85) {
        console.log(`[EMPI] Fuzzy match found (Master ID: ${bestMatch.id}, Score: ${highestScore})`);
        await this.linkPatientToMaster(bestMatch.id, patient.id, hospitalId, highestScore);
        return { masterId: bestMatch.id, type: 'MATCH_FUZZY' };
    }

    // 3. No Match - Create New Identity
    console.log(`[EMPI] No match found. Creating new Master Identity.`);
    const newMaster = await prisma.master_identities.create({
      data: {
        global_uhid: `WOLF-${Date.now().toString().slice(-8)}`, // Simple ID generation
        first_name: patient.first_name,
        last_name: patient.last_name,
        dob: patient.date_of_birth,
        gender: patient.gender,
        phone_hash: phoneHash,
        confidence: 1.0
      }
    });

    await this.linkPatientToMaster(newMaster.id, patient.id, hospitalId, 1.0);
    return { masterId: newMaster.id, type: 'NEW_IDENTITY' };
  }

  async linkPatientToMaster(masterId, localId, hospitalId, score) {
    await prisma.patient_links.create({
      data: {
        master_id: masterId,
        local_patient_id: localId,
        hospital_id: hospitalId,
        match_score: score
      }
    });
  }
}

module.exports = new EmpiService();
