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

// Register new client with email confirmation
export const registerClient = async (clientData) => {
  try {
    const { companyName, contactName, contactEmail, phone, password, industry } = clientData;

    // Check if email already exists
    const existingClient = await Client.findOne({ where: { contactEmail } });
    if (existingClient) {
      console.warn('⚠️ Email already registered');
      throw new Error('Email already registered');
    }

    // Check if company already exists
    const existingCompany = await Client.findOne({ where: { companyName } });
    if (existingCompany) {
      console.warn('⚠️ Company already registered');
      throw new Error('Company already registered');
    }

    // Hash password and create confirmation token
    const hashedPassword = await bcryptjs.hash(password, 10);
    const confirmationToken = crypto.randomBytes(20).toString('hex');
    
    // Create new client
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
    if (!fs.existsSync(templatePath)) {
      console.error('❌ Email template not found');
      throw new Error('Email template not found');
    }
    
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

    console.log('✅ Client registered successfully');
    return newClient;
  } catch (error) {
    console.error(`❌ Registration error: ${error.message}`);
    throw error;
  }
};

// Confirm account and generate tokens
export const confirmClient = async (token) => {
  try {
    const client = await Client.findOne({ where: { confirmationToken: token } });
    if (!client) {
      console.warn('⚠️ Invalid or expired token');
      throw new Error('Invalid or expired token');
    }

    // Confirm account
    client.isConfirmed = true;
    client.confirmationToken = null;
    await client.save();

    // Generate tokens
    const tokenPayload = { 
      clientId: client.id,
      email: client.contactEmail,
      role: 'client'
    };
    
    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...clientData } = client.toJSON();
    
    console.log('✅ Account confirmed successfully');
    return {
      client: clientData,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error(`❌ Confirmation error: ${error.message}`);
    throw error;
  }
};

// Get client by email (without password)
export const getClientByEmail = async (email) => {
  try {
    const client = await Client.findOne({ where: { contactEmail: email } });
    if (!client) {
      console.log('ℹ️ Client not found');
      return null;
    }
    
    const { password, ...clientData } = client.toJSON();
    return clientData;
  } catch (error) {
    console.error(`❌ Client lookup error: ${error.message}`);
    throw error;
  }
};

// Authenticate client and generate tokens
export const loginClient = async (contactEmail, password) => {
  try {
    // Find client with password
    const client = await Client.findOne({ 
      where: { contactEmail },
      attributes: { include: ['password'] }
    });

    if (!client) {
      console.warn('⚠️ Invalid credentials');
      throw new Error('Invalid credentials');
    }

    // Check if account is confirmed
    if (!client.isConfirmed) {
      console.warn('⚠️ Account not confirmed');
      throw new Error('Please confirm your email first');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, client.password);
    if (!isPasswordValid) {
      console.warn('⚠️ Invalid password');
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

    // Update last login
    await client.update({ 
      lastLogin: new Date(),
      loginAttempts: 0
    });

    const { password: _, ...clientData } = client.toJSON();
    
    console.log('✅ Login successful');
    return {
      ...clientData,
      token,
      refreshToken
    };

  } catch (error) {
    console.error(`❌ Login error: ${error.message}`);
    throw error;
  }
};

// Get client by ID (without password)
export const getClientById = async (id) => {
  try {
    const client = await Client.findByPk(id);
    if (!client) {
      console.log('ℹ️ Client not found');
      return null;
    }
    
    const { password, ...clientData } = client.toJSON();
    return clientData;
  } catch (error) {
    console.error(`❌ Client lookup error: ${error.message}`);
    throw error;
  }
};
