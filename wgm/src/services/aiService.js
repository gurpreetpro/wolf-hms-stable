import securityService from './securityService';

// Simulated AI Model Constants
const DETECTABLE_OBJECTS = [
    { label: 'Person', confidence: 0.95, isThreat: false },
    { label: 'Laptop', confidence: 0.85, isThreat: false },
    { label: 'Knife', confidence: 0.88, isThreat: true },
    { label: 'Sidearm', confidence: 0.92, isThreat: true },
    { label: 'Backpack', confidence: 0.70, isThreat: false },
];

const aiService = {
    /**
     * Simulate analyzing a frame from the camera.
     * In production, this would use TensorFlow Lite or Vision Camera.
     */
    analyzeFrame: async () => {
        // Randomly pick an object detected
        const randomObj = DETECTABLE_OBJECTS[Math.floor(Math.random() * DETECTABLE_OBJECTS.length)];
        
        console.log(`[AI Vision] Analyzed frame. Result: ${randomObj.label} (${randomObj.confidence})`);
        
        return randomObj;
    },

    /**
     * Run a scan and report if thread detected.
     */
    scanForThreats: async (location) => {
        try {
            const result = await aiService.analyzeFrame();
            
            if (result.isThreat && result.confidence > 0.8) {
                console.warn(`[AI Alert] THREAT DETECTED: ${result.label}`);
                
                // Auto-report incident
                await securityService.createIncident({
                    title: `AI ALERT: ${result.label} Detected`,
                    description: `Automated Object Detection identified a potential threat (${result.label}) with ${result.confidence * 100}% confidence.`,
                    priority: 'Critical',
                    location: location,
                    type: 'AI_VISION'
                });
                
                return { detected: true, object: result };
            }
            
            return { detected: false, object: result };
        } catch (error) {
            console.error('[AI Service] Scan failed', error);
            throw error;
        }
    }
};

export default aiService;
