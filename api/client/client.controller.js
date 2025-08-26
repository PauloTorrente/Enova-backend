// client.controller.js
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import transporter from '../../config/nodemailer.config.js';
import Client from './client.model.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Client registration with email confirmation
export const register = async (req, res) => {
  try {
    const { companyName, contactEmail, password, industry, contactName, phone } = req.body;
    await registerClient({ 
      companyName, 
      contactEmail, 
      password, 
      industry,
      contactName,
      phone 
    });
    res.status(201).json({ message: 'Registration successful! Please check your email.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Email confirmation endpoint
export const confirm = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await confirmClient(token);
    res.json({ 
      message: 'Account confirmed successfully!',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Client authentication
export const login = async (req, res) => {
  try {
    const { contactEmail, password } = req.body;
    const client = await loginClient(contactEmail, password);
    res.json(client);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// Get client profile
export const getClient = async (req, res) => {
  try {
    const client = await getClientById(req.client.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client info' });
  }
};

// Business logic functions
const registerClient = async (clientData) => {
  const { companyName, contactName, contactEmail, phone, password, industry } = clientData;

  // Check for existing email or company
  const [existingClient, existingCompany] = await Promise.all([
    Client.findOne({ where: { contactEmail } }),
    Client.findOne({ where: { companyName } })
  ]);
  
  if (existingClient) throw new Error('Email already registered');
  if (existingCompany) throw new Error('Company already registered');

  // Create new client
  const hashedPassword = await bcryptjs.hash(password, 10);
  const confirmationToken = crypto.randomBytes(20).toString('hex');
  
  const newClient = await Client.create({
    companyName,
    contactName,
    contactEmail,
    phoneNumber: phone,
    password: hashedPassword,
    industry,
    confirmationToken,
    isConfirmed: false
  });

  // Send confirmation email
  const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
  if (!fs.existsSync(templatePath)) throw new Error('Email template missing');
  
  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  emailTemplate = emailTemplate.replace(
    '{{confirmationUrl}}', 
    `http://localhost:5173/confirm?token=${confirmationToken}`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: contactEmail,
    subject: 'Confirm your business registration',
    html: emailTemplate,
  });

  return newClient;
};

const confirmClient = async (token) => {
  const client = await Client.findOne({ where: { confirmationToken: token } });
  if (!client) throw new Error('Invalid or expired token');

  // Update client confirmation status
  client.isConfirmed = true;
  client.confirmationToken = null;
  await client.save();

  // Generate JWT tokens
  const tokenPayload = { 
    clientId: client.id,
    email: client.contactEmail,
    role: 'client'
  };
  
  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

  const { password: _, ...clientData } = client.toJSON();
  
  return { client: clientData, accessToken, refreshToken };
};

const loginClient = async (contactEmail, password) => {
  const client = await Client.findOne({ 
    where: { contactEmail },
    attributes: { include: ['password'] }
  });

  if (!client) throw new Error('Invalid credentials');
  if (!client.isConfirmed) throw new Error('Please confirm your email first');

  // Validate password
  const isPasswordValid = await bcryptjs.compare(password, client.password);
  if (!isPasswordValid) {
    await client.update({ 
      loginAttempts: (client.loginAttempts || 0) + 1,
      lastFailedAttempt: new Date()
    });
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const tokenPayload = { 
    clientId: client.id,
    email: client.contactEmail,
    role: 'client',
    company: client.companyName
  };

  const [token, refreshToken] = await Promise.all([
    jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' }),
    jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' })
  ]);

  await client.update({ 
    lastLogin: new Date(),
    loginAttempts: 0
  });

  const { password: _, ...clientData } = client.toJSON();
  
  return { ...clientData, token, refreshToken };
};

const getClientById = async (id) => {
  const client = await Client.findByPk(id);
  if (!client) return null;
  const { password, ...clientData } = client.toJSON();
  return clientData;
};

export default {
  register,
  confirm,
  login,
  getClient
};
