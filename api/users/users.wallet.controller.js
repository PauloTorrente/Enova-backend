import * as usersService from './users.service.js';

// Gets a user's wallet balance by ID.
export const getWalletBalance = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ walletBalance: user.walletBalance });
  } catch (error) {
    console.error(`[users.wallet] getWalletBalance failed (id=${id}):`, error.message);
    res.status(500).json({ message: 'Error fetching wallet balance', error: error.message });
  }
};
