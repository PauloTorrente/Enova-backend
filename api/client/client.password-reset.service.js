import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import transporter from '../../config/nodemailer.config.js';
import Client from './client.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generates a 1-hour reset token and emails it to the client. Always
// resolves without error even if the email isn't found — revealing
// whether an email is registered is a user-enumeration risk.
export const requestPasswordReset = async (contactEmail) => {
  const client = await Client.findOne({ where: { contactEmail } });
  if (!client) return;

  const resetToken = crypto.randomBytes(20).toString('hex');
  client.resetPasswordToken = resetToken;
  client.resetPasswordExpires = new Date(Date.now() + 3600000);
  await client.save();

  await sendResetEmail(client, contactEmail, resetToken);
};

const sendResetEmail = async (client, contactEmail, resetToken) => {
  const resetUrl = `https://enova-pulse-rwpd.vercel.app/reset-password?token=${resetToken}`;
  const templatePath = path.join(__dirname, '../../assets/templates/passwordResetTemplateClient.html');

  try {
    if (!fs.existsSync(templatePath)) {
      // Fall back to a plain-text/HTML email if the template is missing,
      // so a missing asset doesn't block the reset flow entirely.
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contactEmail,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Please use the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
        html: `<p>You requested a password reset. Please use the following link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in 1 hour.</p>`,
      });
      return;
    }

    let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
    emailTemplate = emailTemplate.replace('{{resetUrl}}', resetUrl).replace('{{companyName}}', client.companyName);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contactEmail,
      subject: 'Password Reset Request',
      html: emailTemplate,
    });
  } catch (emailError) {
    // Never log the reset token/URL — it's a live credential until expiry.
    console.error(`[client.password-reset] Failed to send reset email to ${contactEmail}:`, emailError.message);
    throw new Error('Failed to send password reset email');
  }
};

// Checks whether a reset token exists and hasn't expired, without
// consuming it — used by the "is this link still valid?" UI check.
export const validatePasswordResetToken = async (token) => {
  const client = await Client.findOne({
    where: { resetPasswordToken: token, resetPasswordExpires: { [Op.gt]: new Date() } }
  });
  return !!client;
};

// Consumes a valid reset token to set a new password, clearing the token
// and any accumulated failed-login count.
export const resetPasswordWithToken = async (token, newPassword) => {
  const client = await Client.findOne({
    where: { resetPasswordToken: token, resetPasswordExpires: { [Op.gt]: new Date() } }
  });

  if (!client) {
    throw new Error('Invalid or expired reset token');
  }

  client.password = await bcryptjs.hash(newPassword, 10);
  client.resetPasswordToken = null;
  client.resetPasswordExpires = null;
  client.loginAttempts = 0;
  await client.save();

  return { clientId: client.id };
};
