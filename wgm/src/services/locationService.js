import * as Location from 'expo-location';
import sensorService from './sensorService';
import securityService from './securityService';
import socketService from './socketService';
import StepDetector from '../utils/StepDetector';
import HeadingEstimator from '../utils/HeadingEstimator';
import CorridorParticleFilter from '../utils/CorridorParticleFilter';

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
        this.batteryLevel = 100;
        this.signalStrength = 5;
        this.strideLength = FUSION_CONFIG.STRIDE_LENGTH;
        this.stepCount = 0;
        this.lastGpsFix = null;

        // Multi-Floor & Altitude Telemetry
        this.floorNumber = 1;
        this.altitude = 0;
        this.basePressure = null;
        this.floorListeners = [];
    }

    setGuardId(id) {
        this.guardId = id;
    }

    setTelemetry(batteryLevel, signalStrength) {
        if (batteryLevel !== undefined && batteryLevel !== null) {
            this.batteryLevel = batteryLevel;
        }
        if (signalStrength !== undefined && signalStrength !== null) {
            this.signalStrength = signalStrength;
        }
    }

    async init() {
        // 1. Request Permissions
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('[LocationService] Permission to access location was denied');
                return;
            }
        } catch (permErr) {
            console.warn('[LocationService] Failed requesting location permissions:', permErr);
            return;
        }

        // 2. Start GPS Watcher safely
        try {
            this.watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 1000,
                    distanceInterval: 1
                },
                (location) => this.handleGPS(location)
            );
        } catch (gpsErr) {
            console.warn('[LocationService] watchPositionAsync failed (GPS might be disabled):', gpsErr);
            // Coarse fallback
            try {
                const last = await Location.getLastKnownPositionAsync({});
                if (last) this.handleGPS(last);
            } catch (e) {}
        }

        // 3. Connect StepDetector listener for IMU dead reckoning
        StepDetector.reset();
        StepDetector.listeners = [];
        StepDetector.addListener((stepEvent) => {
            this.handleStep(stepEvent);
        });

        // 4. Start Sensors for PDR safely
        try {
            await sensorService.start();
            sensorService.addListener(this.handleSensorData.bind(this));
        } catch (sensorErr) {
            console.warn('[LocationService] Failed to start sensorService:', sensorErr);
        }

        // 5. Listen for Mapping Signals
        try {
            const socket = socketService.getSocket();
            if (socket) {
                socket.on('guard_mapping_start', (data) => this.startMapping(data.sessionId));
                socket.on('guard_mapping_stop', () => this.stopMapping());
            }
        } catch (socketErr) {
            console.warn('[LocationService] Socket listener error:', socketErr);
        }

        // 6. Pre-fetch Walkable Corridor Graph for Current Floor
        this.fetchFloorGraph(this.floorNumber).catch(() => {});
    }

    /**
     * Download active floor walkable graph from server for map-matching
     */
    async fetchFloorGraph(floorNum = 1) {
        try {
            const res = await securityService.getActiveFloorMap(floorNum);
            const fp = res?.data?.data || res?.data;
            if (fp?.walkable_graph) {
                CorridorParticleFilter.setGraph(fp.walkable_graph);
                console.log(`[LocationService] Walkable graph loaded for floor L${floorNum}`);
            }
        } catch (err) {
            console.log(`[LocationService] No walkable graph available for floor L${floorNum}`);
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
        this.lastGpsFix = { latitude, longitude, accuracy };

        // Trust GPS if accuracy is good
        if (accuracy <= FUSION_CONFIG.GPS_THRESHOLD) {
            const validGpsHeading = (heading !== null && heading !== undefined && heading >= 0);
            this.currentPosition = {
                latitude,
                longitude,
                accuracy,
                heading: validGpsHeading ? heading : this.currentPosition.heading
            };
            this.pdrActive = false; // Outdoors / good GPS

            // Anchor the IMU heading estimator to reliable GPS heading
            if (validGpsHeading) {
                HeadingEstimator.setHeading(heading);
            }

            // Anchor the Particle Filter to high-confidence GPS fix
            CorridorParticleFilter.init(latitude, longitude, accuracy);
        } else {
            // GPS is weak (indoor/underground), transition to PDR
            this.pdrActive = true;
            this.currentPosition.accuracy = accuracy;
        }
    }

    handleSensorData(data) {
        // 1. Update fused orientation (Gyroscope yaw + Magnetometer compass)
        const fusedHeading = HeadingEstimator.update(data.gyro, data.mag, 0.05);

        // When indoor / PDR active or GPS heading is unavailable, track live fused heading
        if (this.pdrActive || !this.currentPosition.heading || this.currentPosition.heading === 0) {
            this.currentPosition.heading = Math.round(fusedHeading);
        }

        // 2. Pump linear acceleration into StepDetector
        if (data.accel) {
            StepDetector.update(data.accel, data.timestamp || Date.now());
        }

        // 3. Process Barometer for Altitude & Floor Transition
        if (data.baro && data.baro.pressure > 0) {
            this.handleBarometer(data.baro);
        }
    }

    /**
     * Process atmospheric pressure and relative altitude to track hospital floor
     * Ground floor (Level 1) baseline ~ 0m. Each floor is ~3.5m.
     */
    handleBarometer(baro) {
        const { pressure, relativeAltitude } = baro;
        if (!pressure || pressure <= 0) return;

        // Establish ground baseline pressure if not yet calibrated
        if (this.basePressure === null) {
            this.basePressure = pressure;
        }

        // Compute relative altitude: prefer sensor's relativeAltitude if available,
        // else calculate using barometric hypsometric formula (~8.43m per 1 hPa delta)
        let currentAlt = 0;
        if (relativeAltitude !== undefined && relativeAltitude !== null && !isNaN(relativeAltitude)) {
            currentAlt = Number(relativeAltitude);
        } else if (this.basePressure) {
            currentAlt = (this.basePressure - pressure) * 8.43;
        }

        this.altitude = parseFloat(currentAlt.toFixed(1));

        // Floor transition: 1 floor is approx 3.2m - 3.5m
        // Level 1 = 0m to 2.5m, Level 2 = 2.5m to 6.0m, Basement B1 = < -2.0m
        const floorDelta = Math.round(this.altitude / 3.5);
        let calculatedFloor = 1 + floorDelta;
        // Bounded to reasonable hospital range: -2 (B2) to 10 (L10)
        calculatedFloor = Math.max(-2, Math.min(10, calculatedFloor));

        if (calculatedFloor !== this.floorNumber) {
            console.log(`[Barometer] Floor change detected: L${this.floorNumber} -> L${calculatedFloor} (Alt: ${this.altitude}m)`);
            this.setFloor(calculatedFloor, false);
        }
    }

    /**
     * Set floor number manually or via QR anchor
     * @param {number} floorNum - Floor level (e.g. 1, 2, -1)
     * @param {boolean} manual - If true, re-anchors relative altitude to nominal floor height
     */
    setFloor(floorNum, manual = true) {
        const num = parseInt(floorNum, 10) || 1;
        this.floorNumber = num;
        if (manual) {
            this.altitude = parseFloat(((num - 1) * 3.5).toFixed(1));
        }
        console.log(`[LocationService] Floor set to: L${num} (Alt: ${this.altitude}m)`);
        this.notifyFloorListeners(num);
        this.fetchFloorGraph(num).catch(() => {});
        this.reportNow().catch(() => {});
    }

    onFloorChange(callback) {
        this.floorListeners.push(callback);
        try { callback(this.floorNumber); } catch (e) {}
        return () => {
            this.floorListeners = this.floorListeners.filter(cb => cb !== callback);
        };
    }

    notifyFloorListeners(floorNum) {
        for (const cb of this.floorListeners) {
            try { cb(floorNum); } catch (e) {}
        }
    }

    handleStep(stepEvent) {
        this.stepCount += 1;
        // Dynamic stride estimation using Weinberg formula from StepDetector
        const dynamicStride = stepEvent?.strideLength || this.strideLength || FUSION_CONFIG.STRIDE_LENGTH;

        if (this.pdrActive) {
            // Only dead reckon if we have an initial position anchor
            if (this.currentPosition.latitude !== 0 && this.currentPosition.longitude !== 0) {
                // Ensure particle filter is initialized
                if (!CorridorParticleFilter.isInitialized) {
                    CorridorParticleFilter.init(this.currentPosition.latitude, this.currentPosition.longitude);
                }

                // 1. Predict motion with 200 particles
                CorridorParticleFilter.predict(dynamicStride, this.currentPosition.heading);

                // 2. Map-match against corridor graph and resample
                const filtered = CorridorParticleFilter.updateAndResample(this.lastGpsFix);

                let newLat, newLng, newAccuracy;
                if (filtered && filtered.lat && filtered.lng) {
                    newLat = filtered.lat;
                    newLng = filtered.lng;
                    newAccuracy = filtered.confidenceMeters;
                } else {
                    // Fallback: Trigonometric Dead Reckoning
                    const R = 6378137; // Earth Radius in meters
                    const theta = (this.currentPosition.heading * Math.PI) / 180;
                    const dLat = (dynamicStride * Math.cos(theta)) / R;
                    const dLng = (dynamicStride * Math.sin(theta)) / (R * Math.cos((this.currentPosition.latitude * Math.PI) / 180));
                    newLat = this.currentPosition.latitude + (dLat * 180) / Math.PI;
                    newLng = this.currentPosition.longitude + (dLng * 180) / Math.PI;
                    newAccuracy = Math.min(this.currentPosition.accuracy + 0.15, 30);
                }

                this.currentPosition = {
                    ...this.currentPosition,
                    latitude: newLat,
                    longitude: newLng,
                    accuracy: newAccuracy
                };

                console.log(`[PDR+PF] Step #${this.stepCount} (Stride: ${dynamicStride.toFixed(2)}m, Heading: ${this.currentPosition.heading}°). Pos: ${newLat.toFixed(6)}, ${newLng.toFixed(6)} (±${newAccuracy}m)`);

                // During active mapping, report immediately on steps
                if (this.isMapping) {
                    this.reportNow().catch(() => {});
                }
            }
        }
    }

    /**
     * Snap guard position to known checkpoint or QR coordinates.
     * Resets accumulated IMU drift and locks accuracy to 3 meters.
     */
    snapToCoordinates(latitude, longitude, checkpointName = '') {
        if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return;
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        console.log(`[PDR] Snap to checkpoint "${checkpointName}": ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        // Re-anchor particle filter right to the checkpoint
        CorridorParticleFilter.init(lat, lng, 1.5);

        this.currentPosition = {
            ...this.currentPosition,
            latitude: lat,
            longitude: lng,
            accuracy: 2.5 // High precision anchor lock
        };
        // Immediately sync telemetry with Command Centre
        this.reportNow().catch(() => {});
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

    async reportNow() {
        const payload = {
            ...this.currentPosition,
            floor_number: this.floorNumber,
            floor: this.floorNumber,
            altitude: this.altitude,
            batteryLevel: this.batteryLevel != null ? this.batteryLevel : 100,
            signalStrength: this.signalStrength != null ? this.signalStrength : 5,
            isMapping: this.isMapping,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString()
        };

        try {
            await securityService.updateLocation(payload);
            // Also emit via socket for real-time dashboard
            socketService.getSocket()?.emit('guard_location_update', {
                guard_id: this.guardId,
                ...payload
            });
            console.log(`[LocationService] Telemetry reported to HQ. Floor: L${this.floorNumber}, Alt: ${this.altitude}m, Battery: ${payload.batteryLevel}%`);
        } catch (e) {
            console.error('[LocationService] Failed to report location/telemetry', e);
        }
    }

    startReporting(interval = FUSION_CONFIG.UPDATE_INTERVAL) {
        if (this.intervalId) clearInterval(this.intervalId);

        // Immediate initial report
        this.reportNow().catch(() => {});

        this.intervalId = setInterval(async () => {
            await this.reportNow();
        }, interval);
    }
}

export default new LocationService();
