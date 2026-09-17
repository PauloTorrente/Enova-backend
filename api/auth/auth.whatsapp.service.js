import crypto from 'crypto';
import User from '../users/users.model.js';

const OTP_TTL_MINUTES = 10;

// No WhatsApp Business API provider is configured yet (no Twilio/Meta
// credentials in .env) — this generates and stores a real one-time code,
// but "sending" it is a stub. Wire an actual provider call in here once
// credentials exist; until then the code is logged server-side (and
// returned in the response outside production) so the flow is testable.
const deliverOtp = async (phoneNumber, code) => {
  console.log(`[whatsapp-otp] STUB: would send "${code}" to ${phoneNumber} via WhatsApp. No provider configured yet.`);
};

export const sendOtp = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  if (!user.phone_number) throw new Error('No WhatsApp number on file for this user');

  const code = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await user.update({ whatsappOtpCode: code, whatsappOtpExpires: expires });
  await deliverOtp(user.phone_number, code);

  return { phoneNumber: user.phone_number, expiresInMinutes: OTP_TTL_MINUTES, devCode: process.env.NODE_ENV === 'production' ? undefined : code };
};

export const verifyOtp = async (userId, code) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  if (!user.whatsappOtpCode || !user.whatsappOtpExpires) {
    throw new Error('No verification code was requested');
  }
  if (new Date() > new Date(user.whatsappOtpExpires)) {
    throw new Error('Verification code expired');
  }
  if (String(code) !== user.whatsappOtpCode) {
    throw new Error('Incorrect verification code');
  }

  await user.update({ whatsappVerified: true, whatsappOtpCode: null, whatsappOtpExpires: null });
  return true;
};
