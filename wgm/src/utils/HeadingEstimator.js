
/**
 * Wolf Track Heading Estimator
 * Fuses Gyroscope and Magnetometer data using a Complementary Filter.
 * Formula: θ = α * (θ + ω * dt) + (1 - α) * θ_mag
 */
class HeadingEstimator {
    constructor() {
        this.heading = 0; // Current fused heading (degrees)
        this.alpha = 0.98; // Trust gyro 98%, Mag 2% (Standard for IMU)
        
        // Tilt Compensation (Future)
        this.roll = 0;
        this.pitch = 0;
    }

    /**
     * Update filter with new sensor data
     * @param {object} gyro - {x, y, z} in rad/s
     * @param {object} mag - {x, y, z} in uT
     * @param {number} dt - time delta in seconds (e.g., 0.05 for 20Hz)
     * @returns {number} Fused heading in degrees (0-360)
     */
    update(gyro, mag, dt) {
        if (!gyro || !mag) return this.heading;

        // 1. Calculate Magnetometer Heading (Basic)
        // arctan2(y, x) converts simple X/Y values to angle
        let magHeading = Math.atan2(mag.y, mag.x) * (180 / Math.PI);
        if (magHeading < 0) magHeading += 360;

        // 2. Integrate Gyroscope (Dead Reckoning orientation)
        // gyro.z is yaw rate (around vertical axis, assuming phone flat)
        // In real world, we'd project this based on gravity vector (Attitude), 
        // but for Phase 1 we assume phone held roughly flat or vertical.
        const gyroDelta = gyro.z * (180 / Math.PI) * dt; 

        // 3. Complementary Filter
        // We need to handle the 360/0 wrap-around for the filter maths to work
        // Instead of complex quaternion slerp, we just trust Gyro for delta
        // and gently pull towards Mag
        
        // Predict
        let predicted = this.heading + gyroDelta;
        
        // Normalize Predicted
        if (predicted < 0) predicted += 360;
        if (predicted >= 360) predicted -= 360;

        // Calculate discrepancy (shortest path)
        let delta = magHeading - predicted;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        // Correct
        this.heading = predicted + (1 - this.alpha) * delta;

        // Final Normalize
        if (this.heading < 0) this.heading += 360;
        if (this.heading >= 360) this.heading -= 360;

        return this.heading;
    }
    
    reset() {
        this.heading = 0;
    }
}

export default new HeadingEstimator();
