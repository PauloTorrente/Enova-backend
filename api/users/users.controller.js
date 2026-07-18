// Entry point for the users controllers.
//
// Split by responsibility, one file per concern, following the
// `users.<concern>.controller.js` naming convention:
//   - users.profile.controller.js      -> getUserById, updateUser, updateCurrentUser
//   - users.confirmation.controller.js -> confirmUser
//   - users.admin.controller.js        -> getAllUsers, deleteUser, updateUserScore
//   - users.wallet.controller.js       -> getWalletBalance
//
// Kept as the single import surface so users.router.js doesn't need to
// know how this controller is internally organized.
export { getUserById, updateUser, updateCurrentUser } from './users.profile.controller.js';
export { confirmUser } from './users.confirmation.controller.js';
export { getAllUsers, deleteUser, updateUserScore } from './users.admin.controller.js';
export { getWalletBalance } from './users.wallet.controller.js';
