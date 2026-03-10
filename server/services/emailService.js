const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    // 1. Create Transporter (Using Mailtrap or Gmail for Dev)
    // PROD: Use SendGrid/AWS SES
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Simplest for MVP
        auth: {
            user: process.env.EMAIL_USER || 'mock_email@gmail.com',
            pass: process.env.EMAIL_PASS || 'mock_password' 
        }
    });

    // 2. Mock Mode (If no env vars)
    if (!process.env.EMAIL_USER) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
        return;
    }

    try {
        await transporter.sendMail({
            from: '"Wolf Security" <security@wolfhms.com>',
            to,
            subject,
            text
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Email Send Error:', error);
    }
};

module.exports = { sendEmail };
