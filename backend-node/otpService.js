const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM;

let twilioClient = null;
if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (e) {
    console.error('Failed to init Twilio client:', e.message || e);
    twilioClient = null;
  }
}

async function sendOtpToPhone(to, otp, opts = {}) {
  const expiryMinutes = opts.expiryMinutes || 5;
  const body = `Your Apna Invoice OTP is ${otp}. It expires in ${expiryMinutes} minutes.`;

  if (twilioClient && fromNumber) {
    try {
      const msg = await twilioClient.messages.create({ body, from: fromNumber, to });
      return { sent: true, sid: msg.sid };
    } catch (err) {
      console.error('Twilio send error:', err && err.message ? err.message : err);
      return { sent: false, error: err, debug: otp };
    }
  }

  
  console.log('SMS preview (no Twilio configured):', { to, body });
  return { sent: false, debug: otp };
}

function maskPhone(phone) {
  if (!phone) return '';
  // keep country code and last 2 digits
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.length <= 4) return cleaned;
  const last = cleaned.slice(-2);
  const prefix = cleaned.slice(0, Math.min(3, cleaned.length - 2));
  return `${prefix}****${last}`;
}

module.exports = {
  sendOtpToPhone,
  maskPhone,
};
