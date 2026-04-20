const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.emailEnabled = process.env.EMAIL_ENABLED === 'true';
    this.devMode = process.env.DEV_MODE === 'true';
    this.autoVerify = process.env.AUTO_VERIFY_EMAILS === 'true';
    this.adminEmail = process.env.ADMIN_EMAIL;
    this.studentDomain = process.env.STUDENT_EMAIL_DOMAIN;
    this.initialize();
  }

  initialize() {
    if (this.emailEnabled && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      console.log('✅ Email service initialized with Gmail');
    } else {
      console.log('📧 Email service disabled - running in development mode');
      console.log('   All OTPs will be logged to console for testing');
    }
  }

  async sendEmail(to, subject, html, text = null) {
    // Auto-verify emails in dev mode for student domain
    if (this.autoVerify && to.endsWith(this.studentDomain)) {
      console.log(`📧 [AUTO-VERIFIED] Email to ${to} would be sent`);
      return { success: true, mock: true, autoVerified: true, messageId: `auto-${Date.now()}` };
    }

    // For admin email, always try to send if email is enabled
    if (to === this.adminEmail && this.emailEnabled && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to,
          subject,
          html
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        console.error('Email send failed:', error);
        // Fallback to console log
        console.log(`[FALLBACK] Email would be sent to ${to}`);
        return { success: true, mock: true, error: error.message };
      }
    }
    
    // Log to console for testing
    console.log(`
╔══════════════════════════════════════════════════════════╗
║ 📧 EMAIL NOTIFICATION (DEV MODE)                         ║
╠══════════════════════════════════════════════════════════╣
║ To: ${to}
║ Subject: ${subject}
║ Body: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...
╚══════════════════════════════════════════════════════════╝
    `);
    
    return { success: true, mock: true, messageId: `mock-${Date.now()}` };
  }

  async sendOTPEmail(email, otp) {
    // For student emails, auto-verify without sending
    if (this.autoVerify && email.endsWith(this.studentDomain)) {
      console.log(`✅ [AUTO-VERIFIED] Student email: ${email} - OTP: ${otp}`);
      return { success: true, autoVerified: true };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-code { font-size: 36px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; letter-spacing: 10px; background: white; border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗳️ MUST Elections</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <h2>Welcome to MUST Student Elections!</h2>
            <p>Please use the following OTP to verify your email address:</p>
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for <strong>10 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(email, 'Verify Your Email - MUST Elections', html);
  }

  async sendVoteConfirmation(email, candidateName, transactionHash) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .tx-hash { font-family: monospace; background: #e9ecef; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗳️ Vote Confirmation</h1>
          </div>
          <div class="content">
            <p>✓ Your vote has been successfully recorded on the blockchain!</p>
            <p><strong>Voted for:</strong> ${candidateName}</p>
            <p><strong>Transaction Hash:</strong></p>
            <div class="tx-hash">${transactionHash}</div>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(email, 'Vote Confirmation - MUST Elections', html);
  }

  async sendRegistrationApproval(email, fullName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Approved! 🎉</h1>
          </div>
          <div class="content">
            <h2>Dear ${fullName},</h2>
            <p>Congratulations! Your registration for the MUST Student Elections has been <strong>approved</strong>.</p>
            <p>You can now:</p>
            <ul>
              <li>Login to your account</li>
              <li>Connect your MetaMask wallet</li>
              <li>Cast your vote when elections begin</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(email, 'Registration Approved - MUST Elections', html);
  }
}

module.exports = new EmailService();