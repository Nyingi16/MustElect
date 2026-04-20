const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log('📧 Email service initialized');
    } else {
      console.warn('⚠️  Email credentials not configured. Email features disabled.');
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      console.log('Email service disabled. Would send:', { to, subject });
      return { success: true, mock: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendVerificationEmail(email, userId, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${userId}/${token}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗳️ MUST Elections</h1>
            <p>Verify Your Email Address</p>
          </div>
          <div class="content">
            <h2>Welcome to MUST Student Elections!</h2>
            <p>Thank you for registering. Please verify your email address to complete your registration and participate in the upcoming elections.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy this link: <br/>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <hr/>
            <p><strong>Note:</strong> If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>Meru University of Science & Technology<br/>Student Elections System</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(email, 'Verify Your Email - MUST Elections', html);
  }

  async sendOTPEmail(email, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; letter-spacing: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email Verification OTP</h2>
          <p>Your OTP for MUST Elections verification is:</p>
          <div class="otp-code">${otp}</div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(email, 'Your OTP for MUST Elections', html);
  }

  async sendVoteConfirmation(email, candidateName, transactionHash) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Vote Confirmation</h2>
          <div class="success">
            <p>✓ Your vote has been successfully recorded on the blockchain!</p>
          </div>
          <p><strong>Voted for:</strong> ${candidateName}</p>
          <p><strong>Transaction Hash:</strong> ${transactionHash}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p>You can verify your vote on the blockchain explorer.</p>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(email, 'Vote Confirmation - MUST Elections', html);
  }
}

module.exports = new EmailService();