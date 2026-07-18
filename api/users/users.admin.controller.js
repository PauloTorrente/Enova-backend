import * as usersService from './users.service.js';

// Lists all users, optionally filtered by query params. Admins see full
// records; everyone else gets public fields only.
export const getAllUsers = async (req, res) => {
  const requester = req.user;
  const filters = req.query;

  try {
    const users = await usersService.getAllUsers(filters);

    if (requester.role !== 'admin') {
      const publicUsers = users.map(user => {
        const { password, confirmationToken, resetPasswordToken, ...publicData } = user.toJSON();
        publicData.score = publicData.score || 0;
        return publicData;
      });
      return res.json(publicUsers);
    }

    res.json(users);
  } catch (error) {
    console.error('[users.admin] getAllUsers failed:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Soft-deletes a user (marks `deleted: true`, doesn't remove the row).
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await usersService.deleteUser(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(`[users.admin] deleteUser failed (id=${id}):`, error.message);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Adjusts a user's loyalty score — admin only.
export const updateUserScore = async (req, res) => {
  const { id } = req.params;
  const { points } = req.body;

  if (typeof points !== 'number') {
    return res.status(400).json({ message: 'Invalid points value' });
  }

  try {
    const updatedUser = await usersService.updateUserScore(id, points);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Score updated successfully', newScore: updatedUser.score });
  } catch (error) {
    console.error(`[users.admin] updateUserScore failed (id=${id}):`, error.message);
    res.status(500).json({ message: 'Error updating score', error: error.message });
  }
};
