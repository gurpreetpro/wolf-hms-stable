import { useState, useEffect, useCallback, useRef } from 'react';
import sensorService from '../services/sensorService';
import StepDetector from '../utils/StepDetector';
import HeadingEstimator from '../utils/HeadingEstimator';

const DEFAULT_STRIDE_LENGTH = 0.75; // meters
const MIN_CALIBRATION_STEPS = 10; // Min steps between checkpoints to trigger calibration

export const useHIPS = () => {
    // State
    const [isActive, setIsActive] = useState(false);
    const [heading, setHeading] = useState(0); // Fused Heading
    const [steps, setSteps] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Relative PDR (meters)
    const [strideLength, setStrideLength] = useState(DEFAULT_STRIDE_LENGTH);
    
    // Telemetry
    const [debugInfo, setDebugInfo] = useState({ magAccuracy: 'unknown', calibrationScore: 0 });

    // Internal Refs for Calculation
    const sensorUnsubscribeRef = useRef(null);
    const lastCheckpointRef = useRef({ x: 0, y: 0, steps: 0 });

    // Step Handler
    const handleStep = useCallback(() => {
        setPosition(prev => {
            // Convert Compass Heading (0=N, 90=E) to Math Rads (0=E, 90=N)
            // Compass: N=0, E=90, S=180, W=270
            // Math: N=90, E=0, S=270, W=180
            // dx = stride * sin(heading_rad)
            // dy = stride * cos(heading_rad)
            const rad = HeadingEstimator.heading * (Math.PI / 180);
            
            const dx = strideLength * Math.sin(rad); 
            const dy = strideLength * Math.cos(rad);

            return { x: prev.x + dx, y: prev.y + dy };
        });
        setSteps(s => s + 1);
    }, [strideLength]); // Re-bind if stride changes

    // Start HIPS Engine
    const startTracking = useCallback(() => {
        if (isActive) return;
        
        // Reset Utils
        StepDetector.reset();
        HeadingEstimator.reset();
        
        // Reset State (Keep stride length calibration!)
        setSteps(0);
        setPosition({ x: 0, y: 0 });
        setHeading(0);
        lastCheckpointRef.current = { x: 0, y: 0, steps: 0 };
        
        // Start Sensors
        sensorService.start();
        
        // Sensor Loop (Heartbeat)
        sensorUnsubscribeRef.current = sensorService.addListener((data) => {
            // Update Heading
            const h = HeadingEstimator.update(data.gyro, data.mag, 0.05);
            setHeading(Math.round(h));
            
            // Pump Step Detector
            StepDetector.update(data.accel, data.timestamp);
        });

        // Step Listener
        StepDetector.addListener(handleStep);
        
        setIsActive(true);
    }, [isActive, handleStep]);

    // Stop HIPS Engine
    const stopTracking = useCallback(() => {
        sensorService.stop();
        if (sensorUnsubscribeRef.current) sensorUnsubscribeRef.current();
        StepDetector.listeners = []; // Clear listeners
        setIsActive(false);
    }, []);

    /**
     * Drift Correction (QR Scan)
     * Snap position to known coordinates and auto-calibrate stride.
     * @param {number} knownX - Absolute X (or relative map X)
     * @param {number} knownY - Absolute Y (or relative map Y)
     */
    const correctPosition = useCallback((knownX, knownY) => {
        // 1. Calculate Est distance since last checkpoint (measured by steps)
        const stepsTaken = steps - lastCheckpointRef.current.steps;
        if (stepsTaken < MIN_CALIBRATION_STEPS) {
             console.log('[HIPS] Skipped Calibration: Too few steps');
             setPosition({ x: knownX, y: knownY });
             lastCheckpointRef.current = { x: knownX, y: knownY, steps: steps };
             return;
        }

        // 2. Calculate True Euclidean distance between checkpoints
        const dxTrue = knownX - lastCheckpointRef.current.x;
        const dyTrue = knownY - lastCheckpointRef.current.y;
        const distTrue = Math.sqrt(dxTrue*dxTrue + dyTrue*dyTrue);
        
        // 3. Approximate "Walked" Distance (Steps * Current Stride)
        // Note: This assumes straight line walking for calibration which is a constraint we accept for Phase 1.
        // A better approach accumulates step deltas.
        const distEst = stepsTaken * strideLength;

        // 4. Calibration Ratio
        // ratio = True / Estimated
        // If True=12m, Est=10m -> Ratio=1.2 -> Stride needs to be 20% larger
        let ratio = distTrue / distEst;
        
        // Safety Clamp (Don't change stride by more than 30% at once)
        ratio = Math.max(0.7, Math.min(1.3, ratio));
        
        const newStride = parseFloat((strideLength * ratio).toFixed(3));
        
        console.log(`[HIPS] Calibrating: True=${distTrue.toFixed(2)}m, Est=${distEst.toFixed(2)}m (Steps=${stepsTaken})`);
        console.log(`[HIPS] Stride Adjusted: ${strideLength}m -> ${newStride}m`);

        // Apply Updates
        setStrideLength(newStride);
        setDebugInfo({ 
            calibrationScore: ratio, 
            lastCorrection: `Snapped to (${knownX}, ${knownY})` 
        });

        // SNAP POSITION
        setPosition({ x: knownX, y: knownY });
        
        // Update Checkpoint Ref
        lastCheckpointRef.current = { x: knownX, y: knownY, steps: steps };
        
    }, [position, steps, strideLength]);

    return {
        isActive,
        startTracking,
        stopTracking,
        correctPosition, // The "Snap" function
        heading,
        steps,
        position,
        strideLength
    };
};
