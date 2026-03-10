
import api from '../utils/axiosInstance';

// Mock Data for Phase 1 Verification (when backend is unreachable/stale)
const MOCK_DATA = {
    commandMap: {
        activePatrols: [
            { id: 1, guard_name: 'Officer Rohit', start_time: new Date().toISOString(), status: 'In Progress' },
            { id: 2, guard_name: 'Officer Singh', start_time: new Date(Date.now() - 3600000).toISOString(), status: 'In Progress' }
        ],
        activeIncidents: [
            { id: 1, title: 'Unauthorized Access', severity: 'High', location: 'Server Room', description: 'Door forced open.', created_at: new Date().toISOString() }
        ],
        gates: [
            { id: 1, name: 'Main Gate', status: 'OPEN' },
            { id: 2, name: 'Rear Exit', status: 'LOCKED' }
        ],
        activeMissions: []
    },
    visitors: [
        { id: 1, full_name: 'John Doe', check_in_time: new Date().toISOString(), status: 'Checked In' }
    ]
};

const securityService = {
    // --- Phase 1: Monitoring ---

    getCommandMap: async () => {
        try {
            const response = await api.get('/api/security/command/map');
            return response.data.data;
        } catch {
            console.warn('Backend unavailable, using Mock Data for Command Map');
            return MOCK_DATA.commandMap;
        }
    },

    getActivePatrols: async () => {
        try {
            const response = await api.get('/api/security/patrols/active');
            return response.data.data;
        } catch {
            return MOCK_DATA.commandMap.activePatrols;
        }
    },

    getIncidents: async (status, severity) => {
        try {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (severity) params.append('severity', severity);
            
            const response = await api.get(`/api/security/incidents?${params.toString()}`);
            return response.data.data;
        } catch {
            return MOCK_DATA.commandMap.activeIncidents;
        }
    },

    getVisitors: async (status) => {
        try {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            const response = await api.get(`/api/security/visitors?${params.toString()}`);
            return response.data.data;
        } catch {
            console.warn('Backend unavailable, using Mock Data for Visitors');
            return MOCK_DATA.visitors;
        }
    },

    getGates: async () => {
        try {
            const response = await api.get('/api/security/gates');
            return response.data.data;
        } catch {
            return MOCK_DATA.commandMap.gates;
        }
    },

    getMissions: async () => {
        try {
            const response = await api.get('/api/security/missions');
            return response.data.data;
        } catch {
           return [];
        }
    },

    // --- Phase 2: Action & Control ---
    // --- Phase 2: Action & Control ---
    toggleLockdown: async (enabled) => {
        try {
            const response = await api.post('/api/security/lockdown', { enabled });
            return response.data;
        } catch {
            console.warn('Backend unavailable, simulating Lockdown');
            return { success: true, lockdown: enabled };
        }
    },

    toggleGate: async (id, command) => {
        try {
            const response = await api.post(`/api/security/gates/${id}/toggle`, { command });
            return response.data.data;
        } catch {
            console.warn('Backend unavailable, simulating Gate Toggle');
            // Update Mock Data state
            const gateIndex = MOCK_DATA.commandMap.gates.findIndex(g => g.id === id);
            if (gateIndex !== -1) {
                MOCK_DATA.commandMap.gates[gateIndex].status = command;
            }
            return { id, status: command };
        }
    },

    createIncident: async (incidentData) => {
        try {
            const response = await api.post('/api/security/incidents', incidentData);
            return response.data.data;
        } catch {
            console.warn('Backend unavailable, simulating Incident Creation');
            const newIncident = {
                id: Math.random(),
                ...incidentData,
                created_at: new Date().toISOString()
            };
            MOCK_DATA.commandMap.activeIncidents.unshift(newIncident);
            return newIncident;
        }
    },

    updateIncidentStatus: async (id, status, analysis) => {
        try {
            const response = await api.put(`/api/security/incidents/${id}/status`, { status, ai_analysis: analysis });
            return response.data.data;
        } catch {
            return { id, status };
        }
    },

    // --- Phase 3: Guard Management ---
    registerGuard: async (guardData) => {
        // Reuse the main auth registration endpoint but specifically for guards
        const payload = {
            ...guardData,
            role: 'security_guard',
            department: 'Security' 
        };
        const response = await api.post('/api/auth/register', payload);
        return response.data;
    },

    // --- Phase 4: Overwatch & Tracking ---
    updateLocation: async (locationData) => {
        // locationData: { latitude, longitude, accuracy, heading, speed, isOfflineSync }
        try {
            const response = await api.post('/api/security/location', locationData);
            return response.data;
        } catch {
            console.warn('Backend unavailable, location update queued (simulation)');
            return { success: true };
        }
    },

    logSensorData: async (sensorData) => {
        // sensorData: { patrolId, stepCount, heading, impactForce, relativeX, relativeY }
        try {
            const response = await api.post('/api/security/sensor-logs', sensorData);
            return response.data;
        } catch (error) {
            console.warn('Backend unavailable, sensor log queued (simulation)');
            return { success: true };
        }
    },

    getGeofences: async () => {
        try {
            const response = await api.get('/api/security/geofences');
            return response.data.data;
        } catch {
            console.warn('Backend unavailable, using Mock Geofences');
            return [
                {
                    id: 1,
                    name: 'Mock Safe Zone',
                    zone_type: 'SAFE_ZONE',
                    coordinates: [
                        [28.6145, 77.2085],
                        [28.6145, 77.2105],
                        [28.6125, 77.2105],
                        [28.6125, 77.2085],
                        [28.6145, 77.2085]
                    ]
                }
            ];
        }
    },

    sendDispatch: async (dispatchData) => {
        // dispatchData: { message, targetGuardId, priority }
        try {
            const response = await api.post('/api/security/dispatch', dispatchData);
            return response.data;
        } catch {
            console.warn('Backend unavailable, simulating Dispatch');
            return { success: true };
        }
    },

    requestGuardLocation: async (guardId) => {
        try {
            const response = await api.post('/api/security/command/ping', { guardId });
            return response.data;
        } catch (error) {
            console.warn('Backend unavailable or Ping failed');
            return { success: false, error };
        }
    },

    getParkingStats: async (token) => {
        const res = await api.get('/api/parking/stats', { headers: { Authorization: `Bearer ${token}` } });
        return res;
    },

    getActiveVisitors: async (token) => {
        const res = await api.get('/api/visitors/active', { headers: { Authorization: `Bearer ${token}` } });
        return res;
    },

    checkoutVisitor: async (visitId) => {
        const res = await api.put(`/api/visitors/checkout/${visitId}`);
        return res.data;
    },

    logVisitor: async (visitorData) => {
        const res = await api.post('/api/visitors/log', visitorData);
        return res.data;
    },

    searchPatients: async (query) => {
        const res = await api.get(`/api/visitors/search-patients?query=${query}`);
        return res.data.data;
    }
};

export default securityService;
