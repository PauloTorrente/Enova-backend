import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import transporter from '../../config/nodemailer.config.js';
import User from '../users/users.model.js';
import { fileURLToPath } from 'url';

// Get the current file and directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to register a new user
export const register = async ({ email, password, role, firstName, lastName, gender, age, phone_number, city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Attempting to register new user');
  }

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, password, first name, and last name are required.');
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('This email is already registered.');
  }

  // Hash the password before saving
  const hashedPassword = await bcryptjs.hash(password, 10);
  
  // Generate a unique confirmation token
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  // Create a new user in the database
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

  // Load the confirmation email template
  const templatePath = path.join(__dirname, '../../assets/templates/emailTemplate.html');

  if (!fs.existsSync(templatePath)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Email template not found at:', templatePath);
    }
    throw new Error('Error loading the email template');
  }

  // Read the email template file
  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  
  // Create the confirmation URL with the token
  const confirmationUrl = `https://opinacash.com/register-success/${confirmationToken}`;
  
  // Replace the placeholder in the email template with the actual confirmation URL
  emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

  // Send the confirmation email
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirm Your Registration',
      text: `Please confirm your registration by clicking this link: ${confirmationUrl}`,
      html: emailTemplate,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Confirmation email sent');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending confirmation email:', error);
    }
    throw new Error('Error sending confirmation email.');
  }

  return newUser;
};

// Function for user login
export const login = async (email, password) => {
  // Check if the user exists
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('The email or password may be incorrect.');
  }

  // Ensure the user has confirmed their email before logging in
  if (!user.isConfirmed) {
    throw new Error('Please confirm your email before logging in.');
  }

  // Verify the provided password
  const isPasswordValid = await bcryptjs.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('The email or password may be incorrect.');
  }

  // Generate JWT token for authentication
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Generate a refresh token for session management
  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  if (process.env.NODE_ENV === 'development') {
    console.log('User logged in successfully');
  }

  return { token, refreshToken };
};

// Function to renew token
export const refreshToken = async (oldRefreshToken) => {
  try {
    // Verify the old refresh token
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);

    // Generate a new access token
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Token refreshed successfully');
    }

    return newToken;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error validating refresh token');
    }
    throw new Error('Invalid refresh token.');
  }
};
