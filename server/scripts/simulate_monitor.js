const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000/api/devices/ingest';
const INTERVAL_MS = 3000;

// Device IDs
const DEVICES = ['DEV-BP-01', 'DEV-OXI-01', 'DEV-HR-01'];

console.log('🐺 Wolf IoT Simulator Started');
console.log(`Target: ${API_URL}`);

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const simulateBP = async () => {
    const sys = getRandomInt(110, 140);
    const dia = getRandomInt(70, 90);
    const payload = {
        deviceId: 'DEV-BP-01',
        type: 'BP',
        value: `${sys}/${dia}`,
        unit: 'mmHg',
        timestamp: new Date().toISOString()
    };
    await sendData(payload);
};

const simulateOxi = async () => {
    const spo2 = getRandomInt(95, 100);
    const payload = {
        deviceId: 'DEV-OXI-01', // Maps to Bed 1
        type: 'SPO2',
        value: spo2,
        unit: '%',
        timestamp: new Date().toISOString()
    };
    await sendData(payload);
};

const sendData = async (payload) => {
    try {
        const res = await axios.post(API_URL, payload);
        console.log(`[${new Date().toLocaleTimeString()}] Sent ${payload.type}: ${payload.value} (Bed: ${res.data.bed})`);
    } catch (err) {
        console.error(`Error sending ${payload.type}:`, err.message);
    }
};

// Main Loop
setInterval(() => {
    simulateBP();
    setTimeout(simulateOxi, 1500); // Offset Oxi
}, INTERVAL_MS);
