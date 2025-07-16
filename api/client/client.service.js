import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Added for token generation
import transporter from '../../config/nodemailer.config.js';
import Client from './client.model.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register new business client
export const registerClient = async ({ companyName, contactEmail, password, industry }) => {
  // Check if email already exists
  const existingClient = await Client.findOne({ where: { contactEmail } });
  if (existingClient) throw new Error('Email already registered');

  // Check if company already exists  
  const existingCompany = await Client.findOne({ where: { companyName } });
  if (existingCompany) throw new Error('Company already registered');

  // Hash password before saving
  const hashedPassword = await bcryptjs.hash(password, 10);
  
  // Create confirmation token
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  // Save new client to database
  const newClient = await Client.create({
    companyName,
    contactEmail,
    password: hashedPassword,
    industry,
    confirmationToken,
    isConfirmed: false
  });

  // Send confirmation email
  const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
  if (!fs.existsSync(templatePath)) throw new Error('Email template not found');
  
  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  emailTemplate = emailTemplate.replace(
    '{{confirmationUrl}}', 
    `https://enova-backend.onrender.com/api/clients/confirm/${confirmationToken}`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: contactEmail,
    subject: 'Confirm your business registration',
    html: emailTemplate,
  });

  return newClient;
};

// Confirm client account using token
export const confirmClient = async (token) => {
  const client = await Client.findOne({ where: { confirmationToken: token } });
  if (!client) throw new Error('Invalid or expired token');

  client.isConfirmed = true;
  client.confirmationToken = null;
  await client.save();
  
  return client;
};

// Client login with JWT generation
export const loginClient = async (contactEmail, password) => {
  // Find client by email
  const client = await Client.findOne({ where: { contactEmail } });
  if (!client) throw new Error('Invalid credentials');

  // Check if account is confirmed
  if (!client.isConfirmed) throw new Error('Please confirm your email first');

  // Validate password
  const isPasswordValid = await bcryptjs.compare(password, client.password);
  if (!isPasswordValid) throw new Error('Invalid credentials');

  // Generate JWT tokens
  const tokenPayload = { 
    clientId: client.id,
    email: client.contactEmail,
    role: 'client' // Important: Added role for middleware checks
  };

  // Access token (1 hour expiry)
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Refresh token (7 days expiry)
  const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

  // Return client data without password
  const { password: _, ...clientData } = client.toJSON();
  return {
    ...clientData,
    token,
    refreshToken
  };
};

// Get client by ID (without password)
export const getClientById = async (id) => {
  const client = await Client.findByPk(id);
  if (!client) return null;
  
  const { password, ...clientData } = client.toJSON();
  return clientData;
};
