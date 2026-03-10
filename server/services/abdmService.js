const pool = require('../config/db');

/**
 * ABDM Service — Phase G3.1
 * Integrates with Ayushman Bharat Digital Mission (ABDM) APIs
 * 
 * Supports:
 *   - ABHA ID creation & verification
 *   - Health record linking
 *   - Consent management (request, grant, revoke)
 * 
 * Environment Variables Required:
 *   ABDM_CLIENT_ID     — ABDM sandbox/production client ID
 *   ABDM_CLIENT_SECRET — ABDM sandbox/production client secret
 *   ABDM_BASE_URL      — https://dev.abdm.gov.in/gateway (sandbox) or production URL
 * 
 * Reference: https://sandbox.abdm.gov.in/docs/
 */

const ABDM_BASE_URL = process.env.ABDM_BASE_URL || 'https://dev.abdm.gov.in/gateway';
const ABDM_CLIENT_ID = process.env.ABDM_CLIENT_ID || '';
const ABDM_CLIENT_SECRET = process.env.ABDM_CLIENT_SECRET || '';

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get ABDM access token (cached, auto-refresh)
 */
async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    if (!ABDM_CLIENT_ID || !ABDM_CLIENT_SECRET) {
        console.warn('[ABDM] No credentials configured. Set ABDM_CLIENT_ID and ABDM_CLIENT_SECRET.');
        return null;
    }

    try {
        const response = await fetch(`${ABDM_BASE_URL}/v0.5/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: ABDM_CLIENT_ID,
                clientSecret: ABDM_CLIENT_SECRET
            })
        });

        if (!response.ok) {
            throw new Error(`ABDM Auth Failed: ${response.status}`);
        }

        const data = await response.json();
        cachedToken = data.accessToken;
        tokenExpiry = Date.now() + (data.expiresIn || 1800) * 1000 - 60000;
        console.log('[ABDM] Access token obtained');
        return cachedToken;
    } catch (err) {
        console.error('[ABDM] Token Error:', err.message);
        return null;
    }
}

/**
 * Verify an ABHA ID exists and get basic profile
 * @param {string} abhaId — 14-digit ABHA number
 * @returns {object|null} ABHA profile or null
 */
async function verifyAbhaId(abhaId) {
    const token = await getAccessToken();
    if (!token) {
        return { verified: false, reason: 'ABDM not configured', offline: true };
    }

    try {
        const response = await fetch(`${ABDM_BASE_URL}/v1/phr/public/search/byHealthId`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ healthId: abhaId })
        });

        if (!response.ok) {
            return { verified: false, reason: `ABDM returned ${response.status}` };
        }

        const data = await response.json();
        return {
            verified: true,
            profile: {
                healthId: data.healthId,
                healthIdNumber: data.healthIdNumber,
                name: data.name,
                gender: data.gender,
                yearOfBirth: data.yearOfBirth,
                status: data.status
            }
        };
    } catch (err) {
        console.error('[ABDM] Verify Error:', err.message);
        return { verified: false, reason: err.message };
    }
}

// ============================================
// Consent Management
// ============================================

/**
 * Request consent from a patient to access their health records
 * @param {object} params — { patientAbhaId, purpose, dateRange, hospitalId, requestedBy }
 */
async function requestConsent(params) {
    const { patientAbhaId, purpose, dateRange, hospitalId, requestedBy } = params;

    const result = await pool.query(`
        INSERT INTO abdm_consent_requests 
        (patient_abha_id, purpose, date_from, date_to, status, hospital_id, requested_by, created_at)
        VALUES ($1, $2, $3, $4, 'REQUESTED', $5, $6, NOW())
        RETURNING *
    `, [patientAbhaId, purpose || 'CAREMGT', dateRange?.from || null, dateRange?.to || null, hospitalId, requestedBy]);

    const consentRequest = result.rows[0];

    // Send to ABDM if configured
    const token = await getAccessToken();
    if (token) {
        try {
            const abdmResponse = await fetch(`${ABDM_BASE_URL}/v0.5/consent-requests/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CM-ID': 'sbx'
                },
                body: JSON.stringify({
                    requestId: `wolf-${consentRequest.id}`,
                    timestamp: new Date().toISOString(),
                    consent: {
                        purpose: { text: purpose || 'Care Management', code: 'CAREMGT' },
                        patient: { id: patientAbhaId },
                        hiu: { id: process.env.ABDM_HIU_ID || 'wolf-hms' },
                        requester: {
                            name: 'Wolf HMS',
                            identifier: { type: 'REGNO', value: process.env.HOSPITAL_REGNO || 'WOLF-001' }
                        },
                        hiTypes: ['OPConsultation', 'Prescription', 'DischargeSummary', 'DiagnosticReport'],
                        permission: {
                            accessMode: 'VIEW',
                            dateRange: {
                                from: dateRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
                                to: dateRange?.to || new Date().toISOString()
                            },
                            dataEraseAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            frequency: { unit: 'HOUR', value: 1, repeats: 0 }
                        }
                    }
                })
            });

            if (abdmResponse.ok) {
                await pool.query(
                    "UPDATE abdm_consent_requests SET status = 'SENT_TO_ABDM', abdm_request_id = $1 WHERE id = $2",
                    [`wolf-${consentRequest.id}`, consentRequest.id]
                );
            }
        } catch (err) {
            console.error('[ABDM] Consent request failed:', err.message);
        }
    }

    return consentRequest;
}

/**
 * Handle consent callback from ABDM (webhook)
 */
async function handleConsentCallback(payload) {
    const { notification } = payload;
    if (!notification) return { success: false, reason: 'No notification in payload' };

    const status = notification.status;
    const consentRequestId = notification.consentRequestId;

    await pool.query(
        "UPDATE abdm_consent_requests SET status = $1, abdm_consent_id = $2, updated_at = NOW() WHERE abdm_request_id = $3",
        [status, notification.consentArtefacts?.[0]?.id || null, consentRequestId]
    );

    console.log(`[ABDM] Consent ${consentRequestId}: ${status}`);
    return { success: true, status };
}

/**
 * Get consent status for a patient
 */
async function getConsentStatus(patientAbhaId, hospitalId) {
    const result = await pool.query(`
        SELECT * FROM abdm_consent_requests
        WHERE patient_abha_id = $1 AND hospital_id = $2
        ORDER BY created_at DESC LIMIT 20
    `, [patientAbhaId, hospitalId]);
    return result.rows;
}

module.exports = {
    getAccessToken,
    verifyAbhaId,
    requestConsent,
    handleConsentCallback,
    getConsentStatus
};
