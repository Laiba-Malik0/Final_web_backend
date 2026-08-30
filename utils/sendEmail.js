const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Main Send OTP Function
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"SupportFlow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('✅ OTP Email Sent Successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email Sending Error:', error.message);
    return false;
  }
};

module.exports = { transporter, sendEmail };