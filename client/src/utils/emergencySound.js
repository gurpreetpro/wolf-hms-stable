// Emergency Alert Sound Utility
class EmergencySound {
    constructor() {
        this.audio = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.audio = new Audio('/sounds/emergency-alert.mp3');
        this.audio.preload = 'auto';
        this.audio.loop = true;
        this.initialized = true;
    }

    play() {
        if (!this.initialized) {
            this.init();
        }

        // Reset and play
        if (this.audio) {
            this.audio.currentTime = 0;
            this.audio.play().catch(err => {
                console.warn('Audio play failed (user interaction required):', err.message);
            });
        }
    }

    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
    }
}

// Singleton instance
const emergencySound = new EmergencySound();

export default emergencySound;
