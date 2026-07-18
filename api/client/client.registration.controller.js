import * as clientService from './client.service.js';

// Client registration with email confirmation
export const register = async (req, res) => {
  try {
    const { companyName, contactEmail, password, industry, contactName, phone } = req.body;

    await clientService.registerClient({
      companyName, contactEmail, password, industry, contactName, phone
    });

    res.status(201).json({ message: 'Registration successful! Please check your email.' });
  } catch (error) {
    console.error(`[client.registration] register failed (company=${req.body?.companyName}):`, error.message);
    res.status(400).json({ message: error.message });
  }
};
