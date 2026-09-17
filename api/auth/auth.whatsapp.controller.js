import * as whatsappService from './auth.whatsapp.service.js';

// POST /api/auth/whatsapp/send-otp — generates a one-time code tied to the
// logged-in user's phone_number (see Filtro Preliminar: "El WhatsApp es el
// riel de pago", must be verified before it's trusted for payouts).
export const sendOtp = async (req, res) => {
  try {
    const result = await whatsappService.sendOtp(req.user.userId);
    res.status(200).json({ success: true, message: 'Verification code sent.', ...result });
  } catch (error) {
    console.error(`[auth.whatsapp] sendOtp failed (userId=${req.user?.userId}):`, error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/auth/whatsapp/verify-otp — body: { code }
export const verifyOtp = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'code is required' });

  try {
    await whatsappService.verifyOtp(req.user.userId, code);
    res.status(200).json({ success: true, message: 'WhatsApp number verified.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
