import * as usersService from './users.service.js';

// Fields a profile update is allowed to touch — shared by updateUser
// (admin/self editing another profile by ID) and updateCurrentUser
// (self editing via /users/me).
const EDITABLE_PROFILE_FIELDS = [
  'firstName', 'lastName', 'gender', 'age', 'phone_number', 'city',
  'residentialArea', 'purchaseResponsibility', 'childrenCount', 'childrenAges', 'educationLevel'
];

const pickEditableFields = (body) => {
  const updatedData = {};
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (body[key] !== undefined) updatedData[key] = body[key];
  }
  return updatedData;
};

// Gets a single user by ID — full record for admins, public fields only
// for everyone else (e.g. a user looking up another respondent's profile).
export const getUserById = async (req, res) => {
  const { id } = req.params;
  const requester = req.user;

  try {
    const user = await usersService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (requester.role !== 'admin') {
      const { password, confirmationToken, resetPasswordToken, ...publicData } = user.toJSON();
      return res.json(publicData);
    }

    res.json(user);
  } catch (error) {
    console.error(`[users.profile] getUserById failed (id=${id}):`, error.message);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Admin (or an admin editing someone else) updating a profile by ID.
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const requester = req.user;

  if (requester.role !== 'admin' && requester.userId !== Number(id)) {
    return res.status(403).json({ message: 'Forbidden: you can only edit your own profile.' });
  }

  try {
    const updatedUser = await usersService.updateUser(id, pickEditableFields(req.body));
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json(updatedUser);
  } catch (error) {
    console.error(`[users.profile] updateUser failed (id=${id}):`, error.message);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// The logged-in user updating their own profile via /users/me.
export const updateCurrentUser = async (req, res) => {
  const userId = req.user.userId;
  const updatedData = pickEditableFields(req.body);

  if ('phone_number' in updatedData) {
    updatedData.phone_number = updatedData.phone_number
      ? String(updatedData.phone_number).replace(/[^0-9+]/g, '')
      : null;
  }

  try {
    const updatedUser = await usersService.updateUser(userId, updatedData);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, confirmationToken, phone_number, ...safeUser } = updatedUser.toJSON();
    safeUser.hasphone_number = !!phone_number;

    res.json(safeUser);
  } catch (error) {
    console.error(`[users.profile] updateCurrentUser failed (userId=${userId}):`, error.message);
    res.status(400).json({
      message: 'Validation error',
      errors: error.errors?.map(err => err.message) || [error.message]
    });
  }
};
