
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
        
        // Low Pass Filter
        this.gravity = { x: 0, y: 0, z: 0 };
        this.alpha = 0.8; // Filter factor
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

        // 3. Magnitude Calculation
        const magnitude = Math.sqrt(x*x + y*y + z*z);

        // 4. Peak Detection Logic (Simple Crossing)
        // Check if we crossed the threshold
        if (magnitude > this.threshold) {
            // We are in a potential step peak
            if (!this.isPeak) {
                // Rising edge
                this.isPeak = true;
            }
        } else {
            // Falling edge
            if (this.isPeak) {
                // We just finished a peak - Register Step?
                this.isPeak = false;
                this.tryRegisterStep(timestamp, magnitude);
            }
        }

        this.lastMag = magnitude;
    }

    tryRegisterStep(timestamp, magnitude) {
        // Debounce
        if (timestamp - this.lastStepTime > this.minStepDelay) {
            this.lastStepTime = timestamp;
            this.emitStep(magnitude);
        }
    }

    emitStep(magnitude) {
        for (const listener of this.listeners) {
            listener({
                timestamp: this.lastStepTime,
                force: magnitude
            });
        }
    }
    
    reset() {
        this.lastStepTime = 0;
        this.gravity = { x: 0, y: 0, z: 0 };
    }
}

export default new StepDetector();
