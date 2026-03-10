import api from './api';

/**
 * Security API Service for Wolf Guard Mobile
 * Implements Phase 5 (Command & Control) endpoints
 */
const securityService = {

    /**
     * Report a Security Incident
     */
    createIncident: async (incidentData) => {
         // incidentData: { title, type, severity, location, description, media_urls }
         return api.post('/security/incidents', incidentData);
    },

    /**
     * Trigger SOS Panic Button
     * @param {number} latitude - Current latitude
     * @param {number} longitude - Current longitude
     * @param {number} heading - Current heading (optional)
     */
    triggerSOS: async (latitude, longitude, heading = 0) => {
        return api.post('/security/sos', {
            latitude,
            longitude,
            heading
        });
    },

    /**
     * Update Guard Location with Telemetry
     * @param {object} locationData - { latitude, longitude, accuracy, heading, speed, batteryLevel, signalStrength }
     */
    updateLocation: async (locationData) => {
        return api.post('/security/location', locationData);
    },

    /**
     * Fetch Active Geofences
     */
    getGeofences: async () => {
        return api.get('/security/geofences');
    },

    /**
     * Send Voice Dispatch (Admin Only)
     * @param {string} message - Message to broadcast
     * @param {string|null} targetGuardId - Target guard (null = broadcast)
     * @param {string} priority - High/Medium/Critical
     */
    sendDispatch: async (message, targetGuardId = null, priority = 'High') => {
        return api.post('/security/dispatch', {
            message,
            targetGuardId,
            priority
        });
    },

    /**
     * Fetch Mission/Dispatch History
     */
    getMissions: async () => {
        return api.get('/security/missions');
    },

    /**
     * Start Patrol (Alias for existing endpoint)
     */
    startPatrol: async (guardId) => {
        return api.post('/security/patrols/start', { guardId });
    },

    /**
     * End Patrol
     */
    endPatrol: async (patrolId, notes) => {
        return api.put(`/security/patrols/${patrolId}/end`, { patrolId, notes });
    },

    /**
     * Record Checkpoint
     */
    recordCheckpoint: async (patrolId, checkpointName) => {
        return api.put(`/security/patrols/${patrolId}/checkpoint`, { 
            patrolId, 
            checkpointName 
        });
    }
};

export default securityService;
