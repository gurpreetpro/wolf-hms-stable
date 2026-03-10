const EventEmitter = require('events');

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.isConnected = true; // Simulated always connected
    }

    async sendMessage(phoneNumber, message) {
        // In a real implementation, this would use 'whatsapp-web.js' or Twilio
        // For Wolf HMS Gold (Phase 3), we simulate this to avoid banning risk during dev.
        
        console.log(`\n[WhatsApp] ---------------------------------------------------`);
        console.log(`[WhatsApp] To: ${phoneNumber}`);
        console.log(`[WhatsApp] Body: ${message}`);
        console.log(`[WhatsApp] ---------------------------------------------------\n`);

        // Emit event for frontend toasts or logs
        this.emit('message_sent', { to: phoneNumber, body: message, timestamp: new Date() });
        
        return { success: true, messageId: 'SIM-' + Date.now() };
    }

    async sendAppointmentReminder(patientName, phoneNumber, doctorName, time) {
        const msg = `Hello ${patientName}, this is a reminder for your appointment with Dr. ${doctorName} at ${time}. - Wolf HMS`;
        return this.sendMessage(phoneNumber, msg);
    }

    async sendLabReport(patientName, phoneNumber, testName, reportUrl) {
        const msg = `Dear ${patientName}, your ${testName} report is ready. Download it here: ${reportUrl} - Wolf HMS`;
        return this.sendMessage(phoneNumber, msg);
    }
    
    async sendWelcome(patientName, phoneNumber, uhid) {
        const msg = `Welcome to Wolf HMS, ${patientName}! Your UHID is ${uhid}. Use this to login to the Patient App.`;
        return this.sendMessage(phoneNumber, msg);
    }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
