const nodemailer = require('nodemailer');

// Create a transporter object using SendGrid
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net', // SendGrid's SMTP server
  port: 587, // Port for TLS
  secure: false, // Use TLS
  auth: {
    user: 'apikey', // Literally the string 'apikey'
    pass: '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', // Your SendGrid API key
  },
});

// Function to send OTP via email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: 'citywatchet@gmail.com', // Use your verified sender email
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendOTPEmail };