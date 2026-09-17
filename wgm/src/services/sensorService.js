
import { Accelerometer, Gyroscope, Magnetometer, Barometer } from 'expo-sensors';

/**
 * Wolf Track Sensor Service
 * Manages access to device IMU & Barometric sensors for the HIPS PDR Engine.
 */
class SensorService {
    constructor() {
        this.subscriptions = {
            accel: null,
            gyro: null,
            mag: null,
            baro: null
        };
        this.available = {
            accel: false,
            gyro: false,
            mag: false,
            baro: false
        };
        this.listeners = [];
        this.data = {
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 0, z: 0 },
            mag: { x: 0, y: 0, z: 0 },
            baro: { pressure: 0, relativeAltitude: 0 },
            timestamp: 0
        };
        // 50ms = 20Hz sample rate
        this.updateInterval = 50; 
        this.isActive = false;
    }

    /**
     * Set the sensor update interval (ms)
     * @param {number} intervalMs 
     */
    setUpdateInterval(intervalMs) {
        this.updateInterval = intervalMs;
        try { if (this.available.accel) Accelerometer.setUpdateInterval(intervalMs); } catch (e) {}
        try { if (this.available.gyro) Gyroscope.setUpdateInterval(intervalMs); } catch (e) {}
        try { if (this.available.mag) Magnetometer.setUpdateInterval(intervalMs); } catch (e) {}
        try { if (this.available.baro && Barometer.setUpdateInterval) Barometer.setUpdateInterval(1000); } catch (e) {}
    }

    /**
     * Start sensor tracking with hardware availability checks
     */
    async start() {
        if (this.isActive) return;
        
        console.log('[SensorService] Checking hardware sensor availability...');
        try {
            this.available.accel = await Accelerometer.isAvailableAsync().catch(() => false);
        } catch (e) {
            this.available.accel = false;
        }
        try {
            this.available.gyro = await Gyroscope.isAvailableAsync().catch(() => false);
        } catch (e) {
            this.available.gyro = false;
        }
        try {
            this.available.mag = await Magnetometer.isAvailableAsync().catch(() => false);
        } catch (e) {
            this.available.mag = false;
        }
        try {
            this.available.baro = await Barometer.isAvailableAsync().catch(() => false);
        } catch (e) {
            this.available.baro = false;
        }

        console.log('[SensorService] Sensors available:', this.available);
        this.setUpdateInterval(this.updateInterval);

        if (this.available.accel) {
            try {
                this.subscriptions.accel = Accelerometer.addListener(data => {
                    this.data.accel = data;
                    this.emitData();
                });
            } catch (e) {
                console.warn('[SensorService] Could not attach Accelerometer listener:', e);
            }
        }

        if (this.available.gyro) {
            try {
                this.subscriptions.gyro = Gyroscope.addListener(data => {
                    this.data.gyro = data;
                    this.emitData();
                });
            } catch (e) {
                console.warn('[SensorService] Could not attach Gyroscope listener:', e);
            }
        }

        if (this.available.mag) {
            try {
                this.subscriptions.mag = Magnetometer.addListener(data => {
                    this.data.mag = data;
                    this.emitData();
                });
            } catch (e) {
                console.warn('[SensorService] Could not attach Magnetometer listener:', e);
            }
        }

        if (this.available.baro) {
            try {
                this.subscriptions.baro = Barometer.addListener(data => {
                    this.data.baro = data;
                    this.emitData();
                });
            } catch (e) {
                console.warn('[SensorService] Could not attach Barometer listener:', e);
            }
        }

        this.isActive = true;
    }

    /**
     * Stop all sensors to save battery
     */
    stop() {
        if (!this.isActive) return;
        
        console.log('[SensorService] Stopping sensors...');
        try { this.subscriptions.accel?.remove(); } catch (e) {}
        try { this.subscriptions.gyro?.remove(); } catch (e) {}
        try { this.subscriptions.mag?.remove(); } catch (e) {}
        try { this.subscriptions.baro?.remove(); } catch (e) {}
        
        this.subscriptions = { accel: null, gyro: null, mag: null, baro: null };
        this.isActive = false;
    }

    /**
     * Subscribe to fused sensor updates
     * @param {function} callback - Receives { accel, gyro, mag, timestamp }
     * @returns {function} Unsubscribe function
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Broadcast data to all listeners
     * @private
     */
    emitData() {
        // Debounce or synchronize if needed, for now emit on every accel update (heartbeat)
        // We attach a high-res timestamp if available, else Date.now()
        this.data.timestamp = Date.now();
        
        for (const listener of this.listeners) {
            listener(this.data);
        }
    }
}

// Singleton instance
const sensorService = new SensorService();
export default sensorService;
