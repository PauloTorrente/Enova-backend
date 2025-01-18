import * as usersRepo from './users.repository.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import transporter from '../../config/nodemailer.config.js';

// Register a new user and send confirmation email
export async function register({ email, password, role }) {
  const confirmationToken = crypto.randomBytes(20).toString('hex');  // Generate a random token for user confirmation
  const hashedPassword = await bcrypt.hash(password, 10);  // Encrypt password using bcrypt

  const newUser = {
    email,
    password: hashedPassword,
    role,
    deleted: false,
    isConfirmed: false,
    confirmationToken,
    createdAt: new Date(),
  };

  const user = await usersRepo.create(newUser);

  // Link for user to confirm their registration
  const confirmationUrl = `https://example.com/api/users/confirm/${confirmationToken}`;
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
