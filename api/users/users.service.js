import * as usersRepo from './users.repository.js';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import transporter from '../../config/nodemailer.config.js';

// Register a new user and send confirmation email
export async function register({ email, password, role }) {
  const confirmationToken = crypto.randomBytes(20).toString('hex');  // Generate a random token for user confirmation
  const hashedPassword = await bcryptjs.hash(password, 10);  // Encrypt password using bcryptjs

  const newUser = {
    email,
    password: hashedPassword,
    role,
    deleted: false,
    isConfirmed: false,
    confirmationToken,
    createdAt: new Date(),
    walletBalance: 0,
  };

  const user = await usersRepo.create(newUser);

  // Link for user to confirm their registration
  const confirmationUrl = `https://enova-backend.onrender.com/api/users/confirm/${confirmationToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Confirma tu registro',
    text: `Por favor, confirma tu registro siguiendo este enlace: ${confirmationUrl}`,
    html: `<b>Por favor, confirma tu registro siguiendo este enlace:</b> <a href="${confirmationUrl}">${confirmationUrl}</a>`,
  });

  return user;
}

export const getUserById = async (id) => {
  return await usersRepo.getById(id);  // Fetch user by ID
};

export const updateUser = async (id, updatedData) => {
  return await usersRepo.update(id, updatedData);  // Update user details
};

export const updateWalletBalance = async (id, amount) => {
  const user = await usersRepo.getById(id);
  const newBalance = user.walletBalance + amount;
  return await usersRepo.updateWalletBalance(id, newBalance);  
};
