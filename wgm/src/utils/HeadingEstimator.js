
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
     * Calibrate or seed heading from GPS or known checkpoint
     * @param {number} degrees - 0-360
     */
    setHeading(degrees) {
        if (degrees !== null && degrees !== undefined && !isNaN(degrees)) {
            let h = degrees % 360;
            if (h < 0) h += 360;
            this.heading = h;
        }
    }

    /**
     * Update filter with new sensor data (handles gyro-only, mag-only, or fused)
     * @param {object|null} gyro - {x, y, z} in rad/s
     * @param {object|null} mag - {x, y, z} in uT
     * @param {number} dt - time delta in seconds (e.g., 0.05 for 20Hz)
     * @returns {number} Fused heading in degrees (0-360)
     */
    update(gyro, mag, dt = 0.05) {
        const hasGyro = gyro && (gyro.x !== 0 || gyro.y !== 0 || gyro.z !== 0);
        const hasMag = mag && (mag.x !== 0 || mag.y !== 0 || mag.z !== 0);

        if (!hasGyro && !hasMag) return this.heading;

        // 1. Calculate Magnetometer Heading
        let magHeading = null;
        if (hasMag) {
            magHeading = Math.atan2(mag.y, mag.x) * (180 / Math.PI);
            if (magHeading < 0) magHeading += 360;
        }

        // 2. Case: Mag only (no Gyroscope)
        if (!hasGyro && hasMag) {
            this.heading = magHeading;
            return this.heading;
        }

        // 3. Case: Gyro only (no Magnetometer)
        const gyroDelta = (gyro.z || 0) * (180 / Math.PI) * dt;
        let predicted = this.heading + gyroDelta;
        if (predicted < 0) predicted += 360;
        if (predicted >= 360) predicted -= 360;

        if (!hasMag) {
            this.heading = predicted;
            return this.heading;
        }

        // 4. Complementary Filter (Fused Gyro + Mag)
        let delta = magHeading - predicted;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        this.heading = predicted + (1 - this.alpha) * delta;

        // Final Normalize (0-360)
        if (this.heading < 0) this.heading += 360;
        if (this.heading >= 360) this.heading -= 360;

        return this.heading;
    }
    
    reset() {
        this.heading = 0;
    }
}

export default new HeadingEstimator();
