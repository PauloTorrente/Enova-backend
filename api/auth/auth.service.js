import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import transporter from '../../config/nodemailer.config.js';
import User from '../users/users.model.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const register = async ({ email, password, role, firstName, lastName, gender, age, phoneNumber, city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel }) => {
  console.log('Attempting to register user with email:', email);

  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, password, first name, and last name are required.');
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Email is already registered');
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
    phoneNumber: phoneNumber || null,
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

  const templatePath = path.join(__dirname, '../../assets/templates/emailTemplate.html');
  console.log('Resolved email template path:', templatePath);

  if (!fs.existsSync(templatePath)) {
    console.error('Email template not found at:', templatePath);
    throw new Error('Error loading email template');
  }

  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  const confirmationUrl = `https://example.com/api/users/confirm/${confirmationToken}`;
  emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirm Your Registration',
      text: `Please confirm your registration by clicking this link: ${confirmationUrl}`,
      html: emailTemplate,
    });
    console.log('Confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }

  return newUser;
};

export const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isConfirmed) {
    throw new Error('Please confirm your email before logging in');
  }

  const isPasswordValid = await bcryptjs.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.AUTH_SECRET_KEY,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.AUTH_SECRET_KEY,
    { expiresIn: '7d' }
  );

  return { token, refreshToken };
};

export const refreshToken = async (oldRefreshToken) => {
  try {
    const decoded = jwt.verify(oldRefreshToken, process.env.AUTH_SECRET_KEY);

    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      process.env.AUTH_SECRET_KEY,
      { expiresIn: '15m' }
    );

    return newToken;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};
