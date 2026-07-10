const nodemailer = require('nodemailer');

// Create transporter - Force IPv4
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        family: 4,
        tls: {
            rejectUnauthorized: false,
        },
    });
};

// Send verification email
const sendVerificationEmail = async (email, code) => {
    try {
        console.log(`📧 Sending verification email to ${email}`);

        const transporter = createTransporter();
        await transporter.verify();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@goldengates.com',
            to: email,
            subject: '🔐 Golden Gates - Email Verification',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #facc15, #eab308); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #1a1a1a; margin: 0;">✨ Golden Gates</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a1a;">Verify Your Email</h2>
            <p>Your verification code is:</p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; border: 2px dashed #eab308;">
              <span style="font-size: 36px; font-weight: bold; color: #ca8a04; letter-spacing: 5px;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
          </div>
        </div>
      `,
            text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return null;
    }
};

module.exports = { sendVerificationEmail };