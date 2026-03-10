import api from './api';

const mappingService = {
    traceBuffer: [],
    isRecording: false,
    sessionId: null,

    startSession: (buildingId = 'default') => {
        mappingService.traceBuffer = [];
        mappingService.isRecording = true;
        mappingService.sessionId = `trace_${Date.now()}`;
        console.log('[Wolf Trace] Session Started:', mappingService.sessionId);
    },

    recordPoint: (x, y, heading) => {
        if (!mappingService.isRecording) return;
        
        // Simple deduplication/throttling can happen here
        mappingService.traceBuffer.push({
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
            h: Math.round(heading),
            t: Date.now()
        });
    },

    stopSession: async () => {
        if (!mappingService.isRecording) return null;
        
        console.log(`[Wolf Trace] Stopping. Uploading ${mappingService.traceBuffer.length} points.`);
        mappingService.isRecording = false;
        
        try {
            // In a real app, this goes to the backend.
            // For prototype, we just log it or send to a mock endpoint.
            // await api.post('/mapping/trace', { points: mappingService.traceBuffer });
            
            console.log('[Wolf Trace] Upload Success (Simulated)');
            return mappingService.traceBuffer;
        } catch (e) {
            console.error('[Wolf Trace] Upload Failed', e);
            throw e;
        }
    },

    getBufferLength: () => mappingService.traceBuffer.length
};

export default mappingService;
