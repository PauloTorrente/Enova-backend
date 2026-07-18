import * as clientService from './client.service.js';

// Get the authenticated client's own profile
export const getClient = async (req, res) => {
  try {
    const client = await clientService.getClientById(req.client.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error(`[client.profile] getClient failed (clientId=${req.client?.id}):`, error.message);
    res.status(500).json({ message: 'Error fetching client info' });
  }
};
