const { AccessToken } = require('livekit-server-sdk');

// LiveKit Server Configuration
// VPS: 163.245.208.73 (socket.wolfsecurity.in)
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'WolfVoice8B733975';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'KXiqDvuu7fHjucla5boiBKmSTTL3NFxY';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://163.245.208.73:7880';

/**
 * Create a basic LiveKit access token
 * @param {string} participantName - User's display name
 * @param {string} roomName - Room to join
 * @returns {string} JWT token
 */
const createToken = (participantName, roomName) => {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantName,
        ttl: '8h' // Token valid for 8 hours (one shift)
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
    });

    return at.toJwt();
};

/**
 * Create voice token for Wolf Guard PTT
 * @param {number} guardId - Guard's user ID
 * @param {string} guardName - Guard's display name
 * @param {number} hospitalId - Hospital ID for channel segregation
 * @param {string} channelName - Channel name (default: 'patrol-main')
 * @returns {Object} { token, room, url }
 */
const createGuardVoiceToken = (guardId, guardName, hospitalId, channelName = 'patrol-main') => {
    // Room name includes hospital ID for multi-tenant isolation
    const roomName = `guard-h${hospitalId}-${channelName}`;
    
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: guardName,
        name: guardName,
        ttl: '8h'
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,      // Can transmit voice
        canSubscribe: true,    // Can hear others
        canPublishData: true   // Can send text messages
    });

    return {
        token: at.toJwt(),
        room: roomName,
        url: LIVEKIT_URL
    };
};

/**
 * Get LiveKit server URL (for client configuration)
 */
const getLiveKitUrl = () => LIVEKIT_URL;

module.exports = { 
    createToken, 
    createGuardVoiceToken,
    getLiveKitUrl,
    LIVEKIT_URL
};
