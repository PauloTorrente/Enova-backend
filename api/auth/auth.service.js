import User from '../users/users.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import transporter from '../../config/nodemailer.config.js';
import crypto from 'crypto';

export const register = async ({ email, password, role, firstName, lastName, gender, age, phoneNumber, city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel }) => {
  console.log('Attempting to register user with email:', email);

  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, password, first name, and last name are required.');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate confirmation token
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  // Create a new user
  const newUser = {
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
  };

  // Save user in database
  const savedUser = await User.create(newUser).catch((error) => {
    console.error('Error saving the user:', error);
    throw new Error('Error registering user');
  });

  // Placeholder confirmation URL
  const confirmationUrl = `https://example.com/api/users/confirm/${confirmationToken}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirm Your Registration',
      text: `Please confirm your registration by clicking this link: ${confirmationUrl}`,
      html: `<b>Please confirm your registration by clicking this link: <a href="${confirmationUrl}">${confirmationUrl}</a></b>`,
    });
    console.log('Confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }

  return savedUser;
};

export const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isConfirmed) {
    throw new Error('Please confirm your email before logging in');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
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

    // Generate a new token (15 minutes) based on the refresh token
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
