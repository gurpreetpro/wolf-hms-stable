
/**
 * Wolf Track Step Analysis
 * Detects steps from raw accelerometer data using magnitude analysis and dynamic thresholding.
 */
class StepDetector {
    constructor() {
        this.listeners = [];
        this.lastStepTime = 0;
        
        // Config
        this.threshold = 1.2; // roughly 1.2g magnitude
        this.minStepDelay = 300; // ms (fastest human walking pace is ~2 steps/sec)
        
        // State
        this.lastMag = 0;
        this.isPeak = false;
        this.cycleMax = 0;
        this.cycleMin = 999;
        this.weinbergK = 0.40; // Calibrated Weinberg stride constant
        
        // Low Pass Filter
        this.gravity = { x: 0, y: 0, z: 0 };
        this.alpha = 0.8; // Filter factor
    }

    /**
     * Set Weinberg calibration constant (k) based on user height
     * Typically 0.38 - 0.43 for adult walking
     */
    setWeinbergK(k) {
        if (k > 0.2 && k < 0.8) {
            this.weinbergK = k;
        }
    }

    /**
     * Subscribe to step events
     * @param {function} callback 
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Process new accelerometer reading
     * @param {object} accel - {x, y, z} in g
     * @param {number} timestamp - ms
     */
    update(accel, timestamp = Date.now()) {
        if (!accel) return;

        // 1. Isolate Gravity (Low Pass Filter)
        this.gravity.x = this.alpha * this.gravity.x + (1 - this.alpha) * accel.x;
        this.gravity.y = this.alpha * this.gravity.y + (1 - this.alpha) * accel.y;
        this.gravity.z = this.alpha * this.gravity.z + (1 - this.alpha) * accel.z;

        // 2. Remove Gravity (High Pass Filter) - Linear Acceleration
        const x = accel.x - this.gravity.x;
        const y = accel.y - this.gravity.y;
        const z = accel.z - this.gravity.z;

        // 3. Magnitude Calculation (in m/s^2: 1g ≈ 9.80665 m/s^2)
        const gMag = Math.sqrt(x*x + y*y + z*z);
        const accelMps2 = gMag * 9.80665;

        // Track peak and trough for Weinberg stride estimation
        if (accelMps2 > this.cycleMax) this.cycleMax = accelMps2;
        if (accelMps2 < this.cycleMin) this.cycleMin = accelMps2;

        // 4. Peak Detection Logic (Simple Crossing)
        if (gMag > this.threshold) {
            if (!this.isPeak) {
                this.isPeak = true;
            }
        } else {
            if (this.isPeak) {
                this.isPeak = false;
                this.tryRegisterStep(timestamp, gMag);
            }
        }

        this.lastMag = gMag;
    }

    tryRegisterStep(timestamp, magnitude) {
        if (timestamp - this.lastStepTime > this.minStepDelay) {
            this.lastStepTime = timestamp;

            // Weinberg Stride Length Formula:
            // L = k * (a_max - a_min)^(1/4)
            const accelDelta = Math.max(0.1, this.cycleMax - (this.cycleMin < 900 ? this.cycleMin : 0));
            const rawStride = this.weinbergK * Math.pow(accelDelta, 0.25);
            // Clamped between 0.45m (shuffling/indoor) and 1.20m (fast stride)
            const strideLength = Math.max(0.45, Math.min(1.20, parseFloat(rawStride.toFixed(3))));

            this.emitStep(magnitude, strideLength);

            // Reset cycle min/max for next step
            this.cycleMax = 0;
            this.cycleMin = 999;
        }
    }

    emitStep(magnitude, strideLength = 0.75) {
        for (const listener of this.listeners) {
            listener({
                timestamp: this.lastStepTime,
                force: magnitude,
                strideLength: strideLength
            });
        }
    }
    
    reset() {
        this.lastStepTime = 0;
        this.cycleMax = 0;
        this.cycleMin = 999;
        this.gravity = { x: 0, y: 0, z: 0 };
    }
}

export default new StepDetector();
