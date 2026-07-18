import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { fileURLToPath } from 'url';
import transporter from '../../config/nodemailer.config.js';
import User from '../users/users.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Creates a new user account and emails them a confirmation link. The
// account starts unconfirmed (isConfirmed: false) — login is blocked
// until the user clicks the link (see auth.session.service.js).
export const register = async ({ email, password, role, firstName, lastName, gender, age, phone_number, city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel }) => {
  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, password, first name, and last name are required.');
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('This email is already registered.');
  }

  const hashedPassword = await bcryptjs.hash(password, 10);
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  const newUser = await User.create({
    email,
    password: hashedPassword,
    role,
    firstName,
    lastName,
    gender: gender || null,
    age: age || null,
    phone_number: phone_number || null,
    city: city || null,
    residentialArea: residentialArea || null,
    purchaseResponsibility: purchaseResponsibility || null,
    childrenCount: childrenCount || null,
    childrenAges: childrenAges || null,
    educationLevel: educationLevel || null,
    deleted: false,
    isConfirmed: false,
    createdAt: new Date(),
    confirmationToken,
  });

  await sendConfirmationEmail(email, confirmationToken);

  return newUser;
};

// Loads the confirmation email template, fills in this user's token, and
// sends it. Kept as a separate step so a template/mail failure produces a
// clear error without obscuring the (already-successful) user creation.
const sendConfirmationEmail = async (email, confirmationToken) => {
  const templatePath = path.join(__dirname, '../../assets/templates/emailTemplate.html');

  if (!fs.existsSync(templatePath)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[auth.registration] Email template not found at:', templatePath);
    }
    throw new Error('Error loading the email template');
  }

  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  const confirmationUrl = `https://opinacash.com/register-success/${confirmationToken}`;
  emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirm Your Registration',
      text: `Please confirm your registration by clicking this link: ${confirmationUrl}`,
      html: emailTemplate,
    });
  } catch (error) {
    // Log the failure reason only — never the confirmation token/URL, which
    // is a valid account-activation credential.
    console.error(`[auth.registration] Failed to send confirmation email to ${email}:`, error.message);
    throw new Error('Error sending confirmation email.');
  }
};
