import User from './users.model.js';

// Fetch user by primary key (ID)
export const getById = async (id) => {
  return await User.findByPk(id);
};

// Update user by ID with new data
export const update = async (id, updatedData) => {
  const user = await User.findByPk(id);
  if (!user) return null;

  await user.update(updatedData);
  return user;
};

// Create a new user
export const create = async (userData) => {
  return await User.create(userData);
};

// Fetch all users (with optional filters)
export const getAll = async (filters = {}) => {
  return await User.findAll({ where: filters });
};

// Delete a user by ID (soft delete)
export const softDelete = async (id) => {
  await User.update({ deleted: true }, { where: { id } });
  return await User.findByPk(id);
};

// Fetch users by role
export const getByRole = async (role) => {
  return await User.findAll({ where: { role } });
};

// Update user's wallet balance
export const updateWalletBalance = async (id, newBalance) => {
  await User.update({ walletBalance: newBalance }, { where: { id } });
  return await User.findByPk(id);
};
