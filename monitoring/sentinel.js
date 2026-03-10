const axios = require('axios');
const { Client } = require('pg');

// Config
const HEALTH_URL = 'https://wolf-hms-server-fdurncganq-el.a.run.app/api/health';
const LOGIN_URL = 'https://wolf-hms-server-fdurncganq-el.a.run.app/api/auth/login';
const DB_CHECK_URL = 'https://wolf-hms-server-fdurncganq-el.a.run.app/api/db-check';
const TELEGRAM_BOT_TOKEN = '8486608624:AAExvAKl-TzaXC9PJS_mCC92nHt5hRbVIRc';
// Chat ID is still needed. User can message bot and we'll try to find it.
let TELEGRAM_CHAT_ID = '7586880056'; 

const checkSystem = async () => {
    console.log('🛡️ Sentinel starting watch...');
    const issues = [];

    // 1. Health Check
    try {
        console.log('Checking Health...');
        await axios.get(HEALTH_URL);
    } catch (err) {
        issues.push(`Health Check Failed: ${err.message}`);
    }

    // 2. DB Check
    try {
        console.log('Checking Database...');
        await axios.get(DB_CHECK_URL);
    } catch (err) {
        issues.push(`DB Check Failed: ${err.message}`);
    }

    // 3. Login Simulation (Demo Admin)
    try {
        console.log('Simulating Login...');
        await axios.post(LOGIN_URL, {
            username: 'demo_admin',
            password: 'password123' // Assuming this is set for demo
        });
    } catch (err) {
        // demo_admin might not exist or password different, capturing strict errors only
        if (err.response && err.response.status >= 500) {
            issues.push(`Login Critical Failure: ${err.message}`);
        }
    }

    if (issues.length > 0) {
        console.error('❌ Issues found:', issues);
        if (TELEGRAM_CHAT_ID) {
            await sendTelegramAlert('Sentinel Report', issues.join('\n'));
        } else {
            console.log('⚠️ No Telegram Chat ID. Attempting to fetch updates...');
            await tryFetchChatId();
        }
    } else {
        console.log('✅ System Nominal');
    }
};

const sendTelegramAlert = async (title, message) => {
    if (!TELEGRAM_CHAT_ID) return;
    try {
        const text = `🚨 *${title}*\n\n${message}`;
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
        console.log('Alert sent to Telegram');
    } catch (err) {
        console.error('Failed to send Telegram alert:', err.message);
    }
};

const tryFetchChatId = async () => {
    try {
        const res = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
        if (res.data.result.length > 0) {
            // Get most recent chat ID
            const chat = res.data.result[0].message.chat;
            console.log(`💡 Found Chat ID: ${chat.id} (${chat.first_name})`);
            TELEGRAM_CHAT_ID = chat.id;
        }
    } catch (err) {
        console.error('Failed to fetch updates:', err.message);
    }
};

// Run
checkSystem();
