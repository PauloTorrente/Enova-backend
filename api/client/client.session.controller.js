import * as clientService from './client.service.js';

// Client authentication
export const login = async (req, res) => {
  const { contactEmail, password } = req.body;
  try {
    const client = await clientService.loginClient(contactEmail, password);
    res.json(client);
  } catch (error) {
    console.error(`[client.session] login failed (email=${contactEmail}):`, error.message);
    res.status(401).json({ message: error.message });
  }
};
