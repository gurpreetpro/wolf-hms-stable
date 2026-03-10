
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';

/**
 * Wolf Track Sensor Service
 * Manages access to device IMU sensors for the HIPS PDR Engine.
 */
class SensorService {
    constructor() {
        this.subscriptions = {
            accel: null,
            gyro: null,
            mag: null
        };
        this.listeners = [];
        this.data = {
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 0, z: 0 },
            mag: { x: 0, y: 0, z: 0 },
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
        Accelerometer.setUpdateInterval(intervalMs);
        Gyroscope.setUpdateInterval(intervalMs);
        Magnetometer.setUpdateInterval(intervalMs);
    }

    /**
     * Start sensor tracking
     */
    start() {
        if (this.isActive) return;
        
        console.log('[SensorService] Starting sensors...');
        this.setUpdateInterval(this.updateInterval);

        this.subscriptions.accel = Accelerometer.addListener(data => {
            this.data.accel = data;
            this.emitData();
        });

        this.subscriptions.gyro = Gyroscope.addListener(data => {
            this.data.gyro = data;
            this.emitData();
        });

        this.subscriptions.mag = Magnetometer.addListener(data => {
            this.data.mag = data;
            this.emitData();
        });

        this.isActive = true;
    }

    /**
     * Stop all sensors to save battery
     */
    stop() {
        if (!this.isActive) return;
        
        console.log('[SensorService] Stopping sensors...');
        this.subscriptions.accel?.remove();
        this.subscriptions.gyro?.remove();
        this.subscriptions.mag?.remove();
        
        this.subscriptions = { accel: null, gyro: null, mag: null };
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
