import { LiveKitRoom, AudioSession, RoomEvent, Room } from 'livekit-client';
import api from './api';

/**
 * Voice Service (Wolf Voice)
 * Handles PTT (Push-to-Talk) using LiveKit WebRTC
 */
class VoiceService {
    constructor() {
        this.room = null;
        this.isConnected = false;
        this.isTransmitting = false;
        this.token = null;
        this.url = 'wss://your-livekit-server.io'; // TODO: Get from Config
    }

    /**
     * Connect to the Squad Voice Channel
     * @param {string} roomName - e.g., 'squad-alpha'
     */
    async connect(roomName) {
        if (this.isConnected) return;

        try {
            // 1. Get Token from Backend
            const res = await api.post('/security/voice/token', { roomName });
            if (!res.data.success) throw new Error('Failed to get voice token');
            this.token = res.data.data.token;

            // 2. Connect to LiveKit
            this.room = new Room({ adaptiveStream: true, dynacast: true });
            
            this.room.on(RoomEvent.Connected, () => {
                console.log('[Voice] Connected to Squad Channel');
                this.isConnected = true;
            });

            this.room.on(RoomEvent.Disconnected, () => {
                console.log('[Voice] Disconnected');
                this.isConnected = false;
            });

            // 3. Audio Session (Important for mobile)
            // await AudioSession.startAudioSession(); 

            await this.room.connect(this.url, this.token);

            // Default to muted (PTT Mode)
            await this.room.localParticipant.setMicrophoneEnabled(false);

        } catch (e) {
            console.error('[Voice] Connection Failed:', e);
            throw e;
        }
    }

    /**
     * PTT: Start Talking (Unmute)
     */
    async startTalking() {
        if (!this.room || !this.isConnected) return;
        try {
            this.isTransmitting = true;
            await this.room.localParticipant.setMicrophoneEnabled(true);
            console.log('[Voice] Transmitting...');
        } catch (e) {
            console.error('[Voice] PTT Error:', e);
        }
    }

    /**
     * PTT: Stop Talking (Mute)
     */
    async stopTalking() {
        if (!this.room || !this.isConnected) return;
        try {
            this.isTransmitting = false;
            await this.room.localParticipant.setMicrophoneEnabled(false);
            console.log('[Voice] Muted');
        } catch (e) {
            console.error('[Voice] PTT Release Error:', e);
        }
    }

    /**
     * Disconnect
     */
    async disconnect() {
        if (this.room) {
            this.room.disconnect();
            this.room = null;
        }
        this.isConnected = false;
    }
}

export default new VoiceService();
