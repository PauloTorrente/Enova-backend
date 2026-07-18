import Client from './client.model.js';

// Lists every client in the system — client_admin only.
export const getAllClients = async (req, res) => {
  try {
    if (req.client.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const clients = await Client.findAll({
      attributes: [
        'id', 'companyName', 'contactName', 'contactEmail',
        'industry', 'role', 'createdAt', 'lastLogin',
        'isConfirmed', 'phoneNumber'
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'All clients retrieved successfully',
      clients,
      metadata: {
        totalClients: clients.length,
        adminId: req.client.id,
        adminCompany: req.client.companyName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`[client.admin] getAllClients failed (adminId=${req.client?.id}):`, error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
