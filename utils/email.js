import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.privateemail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // generated ethereal user or real user
        pass: process.env.SMTP_PASS, // generated ethereal password or real password
    },
});

/**
 * Send an OTP email to the user.
 * @param {string} to - The recipient's email address
 * @param {string} otp - The 6-digit OTP code to send
 * @param {string} purpose - 'forgot_password' or 'email_verification'
 */
export const sendOtpEmail = async (to, otp, purpose = 'forgot_password') => {
    const subject = purpose === 'forgot_password'
        ? 'Kegel360 - Password Reset OTP'
        : 'Kegel360 - Email Verification OTP';

    const textContent = purpose === 'forgot_password'
        ? `You have requested to reset your password. Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request this, please ignore this email.`
        : `Please verify your email address. Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Kegel360 OTP</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; }
        .header { background-color: #F59BB1; color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 1px; }
        .content { padding: 40px 30px; color: #3a3541; text-align: center; }
        .content p { font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        .otp-box { background-color: #f4f5fa; padding: 20px; border-radius: 8px; margin: 30px auto; max-width: 300px; border: 1px solid #e1e1e1; }
        .otp-code { font-size: 32px; font-weight: 700; color: #F59BB1; letter-spacing: 8px; margin: 0; }
        .warning { font-size: 14px; color: #8a8d93; margin-top: 30px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #8a8d93; border-top: 1px solid #f4f5fa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Kegel360</h1>
        </div>
        <div class="content">
          <p>${purpose === 'forgot_password' ? 'You have requested to reset your password.' : 'Please verify your email address.'}</p>
          <div class="otp-box">
            <h2 class="otp-code">${otp}</h2>
          </div>
          <p>Please use this code to complete your request. It is valid for <strong>10 minutes</strong>.</p>
          <p class="warning">If you did not request this email, no further action is required and you can safely ignore it.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kegel360. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const info = await transporter.sendMail({
            from: `"Kegel360" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text: textContent,
            html: htmlContent,
        });
        console.log(`Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Could not send email');
    }
};

export default {
    sendOtpEmail
};
