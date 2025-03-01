require('dotenv').config(); // Load environment variables
const { Vonage } = require('@vonage/server-sdk'); // Correct import

// Initialize Vonage client
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

// Function to send SMS
const sendOTPSMS = async (phone, otp) => {
  try {
    // Remove the first digit and add +251
    const formattedPhone = `+251${phone.slice(1)}`;

    const from = process.env.VONAGE_PHONE_NUMBER; // Your Vonage phone number
    const to = formattedPhone; // Recipient's phone number (in international format)
    const text = `Your OTP code is ${otp}. It will expire in 10 minutes.`;

    // Send SMS using the correct method
    const response = await vonage.sms.send({ to, from, text });
    console.log(`OTP sent to ${formattedPhone}: ${otp}`);
    console.log('Message ID:', response.messages[0]['message-id']);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

module.exports = { sendOTPSMS };