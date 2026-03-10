import * as Location from 'expo-location';
import sensorService from './sensorService';
import securityService from './securityService';
import socketService from './socketService';

const FUSION_CONFIG = {
    GPS_THRESHOLD: 20, // meters. If accuracy > this, use PDR.
    STRIDE_LENGTH: 0.75, // meters (can be calibrated later)
    UPDATE_INTERVAL: 2000, // ms (Normal)
    MAPPING_INTERVAL: 500, // ms (High Freq)
};

class LocationService {
    constructor() {
        this.currentPosition = {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            heading: 0
        };
        this.isMapping = false;
        this.sessionId = null;
        this.lastStepTime = 0;
        this.pdrActive = false;
        this.intervalId = null;
        this.watchId = null;
    }

    async init() {
        // 1. Request Permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.error('Permission to access location was denied');
            return;
        }

        // 2. Start GPS Watcher
        this.watchId = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000,
                distanceInterval: 1
            },
            (location) => this.handleGPS(location)
        );

        // 3. Start Sensors for PDR
        sensorService.start();
        sensorService.addListener(this.handleSensorData.bind(this));

        // 4. Start Reporting Loop (Disabled by default, waiting for Clock In)
        // this.startReporting(); 

        // 5. Listen for Mapping Signals
        const socket = socketService.getSocket();
        if (socket) {
            socket.on('guard_mapping_start', (data) => this.startMapping(data.sessionId));
            socket.on('guard_mapping_stop', () => this.stopMapping());
        }
    }

    setReportingEnabled(enabled) {
        if (enabled) {
            this.startReporting();
        } else {
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    handleGPS(location) {
        const { latitude, longitude, accuracy, heading } = location.coords;
        
        // Trust GPS if accuracy is good
        if (accuracy <= FUSION_CONFIG.GPS_THRESHOLD) {
            this.currentPosition = {
                latitude,
                longitude,
                accuracy,
                heading: heading || this.currentPosition.heading
            };
            this.pdrActive = false; // GPS is recovering
        } else {
            // GPS is weak, rely on PDR (Sensor Fusion will update position)
            this.pdrActive = true;
            // Still update accuracy/heading if available
            this.currentPosition.accuracy = accuracy;
        }
    }

    handleSensorData(data) {
        // Basic Step Detection (Peak Detection on Mag of Accel)
        const { x, y, z } = data.accel;
        const mag = Math.sqrt(x*x + y*y + z*z);
        const now = Date.now();

        if (mag > 1.2 && (now - this.lastStepTime > 500)) { // 1.2G threshold, 500ms debounce
            this.lastStepTime = now;
            this.handleStep();
        }

        // Heading from Magnetometer (Simplified)
        // In real app, we need tilt compensation
        // For now, let's trust GPS heading or previous heading
    }

    handleStep() {
        if (this.pdrActive) {
            // Calculate new lat/lng based on heading and stride length
            // Delta Lat = (d * cos(theta)) / EarthRadius
            // Delta Lng = (d * sin(theta)) / (EarthRadius * cos(lat))
            
            const R = 6378137; // Earth Radius in meters
            const d = FUSION_CONFIG.STRIDE_LENGTH;
            const theta = (this.currentPosition.heading * Math.PI) / 180; // Radians

            const dLat = (d * Math.cos(theta)) / R;
            const dLng = (d * Math.sin(theta)) / (R * Math.cos((this.currentPosition.latitude * Math.PI) / 180));

            const newLat = this.currentPosition.latitude + (dLat * 180) / Math.PI;
            const newLng = this.currentPosition.longitude + (dLng * 180) / Math.PI;

            this.currentPosition = {
                ...this.currentPosition,
                latitude: newLat,
                longitude: newLng,
                accuracy: this.currentPosition.accuracy + 0.5 // Degrade accuracy slightly
            };
            
            console.log('[PDR] Step Detected. Estimated Pos:', newLat, newLng);
        }
    }

    startMapping(sessionId) {
        console.log('[LocationService] Mapping Mode ENABLED');
        this.isMapping = true;
        this.sessionId = sessionId;
        this.startReporting(FUSION_CONFIG.MAPPING_INTERVAL);
    }

    stopMapping() {
        console.log('[LocationService] Mapping Mode DISABLED');
        this.isMapping = false;
        this.sessionId = null;
        this.startReporting(FUSION_CONFIG.UPDATE_INTERVAL);
    }

    startReporting(interval = FUSION_CONFIG.UPDATE_INTERVAL) {
        if (this.intervalId) clearInterval(this.intervalId);

        this.intervalId = setInterval(async () => {
             const payload = {
                 ...this.currentPosition,
                 isMapping: this.isMapping,
                 sessionId: this.sessionId,
                 timestamp: new Date().toISOString()
             };
             
             try {
                 await securityService.updateLocation(payload);
                 // Also emit via socket for real-time dashboard
                 socketService.getSocket()?.emit('guard_location_update', { 
                     guard_id: 'CURRENT_USER_ID', // Replaced by backend auth context usually, but good to send if needed
                     ...payload 
                 });
             } catch (e) {
                 console.error('Failed to report location', e);
             }
        }, interval);
    }
}

export default new LocationService();
