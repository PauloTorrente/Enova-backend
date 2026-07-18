import Client from './client.model.js';

// Fetches a client by ID, stripped of its password hash.
export const getClientById = async (id) => {
  try {
    const client = await Client.findByPk(id);
    if (!client) return null;

    const { password, ...clientData } = client.toJSON();
    return clientData;
  } catch (error) {
    console.error(`[client.lookup] getClientById failed (id=${id}):`, error.message);
    throw error;
  }
};
