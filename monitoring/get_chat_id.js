const axios = require('axios');
const TELEGRAM_BOT_TOKEN = '8486608624:AAExvAKl-TzaXC9PJS_mCC92nHt5hRbVIRc';

const getChatId = async () => {
    try {
        console.log('Fetching updates...');
        const res = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
        console.log('Response:', JSON.stringify(res.data, null, 2));
        
        if (res.data.result.length > 0) {
            const chat = res.data.result[res.data.result.length - 1].message.chat;
            console.log(`\n✅ FOUND CHAT ID: ${chat.id}`);
        } else {
            console.log('\n⚠️ No messages found. Please message the bot @WOLF_HMS_Alerts_bot first.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
};

getChatId();
