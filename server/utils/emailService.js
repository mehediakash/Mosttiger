const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendOTPEmail(email, otp, purpose) {
    const subjectMap = {
      signup: 'Verify Your Email - OTP Code',
      reset_password: 'Password Reset OTP',
      email_verification: 'Email Verification OTP'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Online Betting Platform</h2>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 10px;">
          <h3 style="color: #555;">${subjectMap[purpose]}</h3>
          <p style="color: #666; font-size: 16px;">Your OTP code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #2c5aa0; letter-spacing: 5px;">
              ${otp}
            </span>
          </div>
          <p style="color: #888; font-size: 14px;">
            This OTP will expire in 10 minutes. Please do not share this code with anyone.
          </p>
        </div>
        <p style="text-align: center; color: #999; margin-top: 20px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@bettingplatform.com',
      to: email,
      subject: subjectMap[purpose],
      html: html
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email, name) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Welcome to Our Betting Platform!</h2>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 10px;">
          <h3 style="color: #555;">Hello ${name},</h3>
          <p style="color: #666; font-size: 16px;">
            Thank you for joining our platform. Your account has been successfully created and verified.
          </p>
          <p style="color: #666; font-size: 16px;">
            Start exploring our exciting games and sports betting options!
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@bettingplatform.com',
      to: email,
      subject: 'Welcome to Our Platform!',
      html: html
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Welcome email sending failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();