// utils/send_email.js
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, body, isHtml = false }) => {
  try {
    // Create reusable transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'razanserreih03@gmail.com',
        pass: 'wkjxqyrvrxmhpdry'
      }
    });

    // Mail options
    const mailOptions = {
      from: 'razanserreih03@gmail.com',
      to,
      subject,
      [isHtml ? 'html' : 'text']: body
    };

    // Send mail
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.response);
    return { success: true };
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendEmail;
