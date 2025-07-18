import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import transporter from '../../config/nodemailer.config.js';
import User from '../users/users.model.js';

// Get the current file and directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Handles password reset requests by generating a token and sending reset instructions via email
 * @param {string} email - The user's email address
 * @returns {Promise<Object>} Object with success message
 * @throws {Error} If email is not found or email sending fails
 */
export const requestPasswordReset = async (email) => {
  // Find user by email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Email not found in our system');
  }

  // Generate reset token with 1 hour expiration
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour

  // Update user with reset token and expiration
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetExpires;
  await user.save();

  // Load the password reset email template
  const templatePath = path.join(__dirname, '../../assets/templates/passwordResetTemplate.html');

  if (!fs.existsSync(templatePath)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Password reset template not found at:', templatePath);
    }
    throw new Error('Error loading the password reset template');
  }

  // Read the email template file
  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  
  // Create the reset URL with the token
  const resetUrl = `https://opinacash.com/reset-password?token=${resetToken}`;
  
  // Replace the placeholder in the email template
  emailTemplate = emailTemplate.replace('{{resetUrl}}', resetUrl);

  try {
    // Send password reset email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: emailTemplate,
      text: `Para restablecer tu contraseña, visita este enlace: ${resetUrl}`
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset email sent to ${email}`);
    }

    return { message: 'Password reset instructions sent to your email' };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Resets user password after validating the reset token
 * @param {string} token - The reset token from email
 * @param {string} newPassword - The new password to set
 * @returns {Promise<Object>} Object with success message
 * @throws {Error} If token is invalid/expired or password update fails
 */
export const resetPassword = async (token, newPassword) => {
  // Find user with valid, non-expired token
  const user = await User.findOne({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { [Op.gt]: new Date() }
    }
  });

  if (!user) {
    throw new Error('Invalid or expired password reset token');
  }

  try {
    // Hash new password and clear reset token fields
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset successful for user ${user.email}`);
    }

    return { message: 'Haz cambiado tu contraseña' };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw new Error('Failed to reset password');
  }
};
