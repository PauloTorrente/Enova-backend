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

// Register new business client
export const registerClient = async (clientData) => {
  console.log('[SERVICE] Dados recebidos do controller:', clientData);
  
  try {
    const { companyName, contactName, contactEmail, phone, password, industry } = clientData;

    console.log('[SERVICE] Verificando se email já existe...');
    const existingClient = await Client.findOne({ where: { contactEmail } });
    if (existingClient) throw new Error('Email already registered');

    console.log('[SERVICE] Verificando se empresa já existe...');
    const existingCompany = await Client.findOne({ where: { companyName } });
    if (existingCompany) throw new Error('Company already registered');

    console.log('[SERVICE] Gerando hash da senha...');
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    const confirmationToken = crypto.randomBytes(20).toString('hex');
    
    console.log('[SERVICE] Criando cliente no banco...');
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

    console.log('[SERVICE] Cliente criado com ID:', newClient.id);

    console.log('[SERVICE] Preparando email de confirmação...');
    const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
    if (!fs.existsSync(templatePath)) throw new Error('Email template not found');
    
    let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
    emailTemplate = emailTemplate.replace(
      '{{confirmationUrl}}', 
      `https://enova-backend.onrender.com/api/clients/confirm/${confirmationToken}`
    );

    console.log('[SERVICE] Enviando email para:', contactEmail);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contactEmail,
      subject: 'Confirm your business registration',
      html: emailTemplate,
    });

    return newClient;
  } catch (error) {
    console.error('[SERVICE] Erro durante registro:', error);
    throw error;
  }
};

// Confirm client account using token
export const confirmClient = async (token) => {
  console.log('[SERVICE] Confirmando conta com token:', token);
  
  try {
    const client = await Client.findOne({ where: { confirmationToken: token } });
    if (!client) throw new Error('Invalid or expired token');

    console.log('[SERVICE] Confirmando conta do cliente ID:', client.id);
    client.isConfirmed = true;
    client.confirmationToken = null;
    await client.save();
    
    return client;
  } catch (error) {
    console.error('[SERVICE] Erro ao confirmar conta:', error);
    throw error;
  }
};

// Client login with JWT generation
export const loginClient = async (contactEmail, password) => {
  console.log('[SERVICE] Tentativa de login com email:', contactEmail);
  
  try {
    console.log('[SERVICE] Buscando cliente no banco...');
    const client = await Client.findOne({ where: { contactEmail } });
    if (!client) throw new Error('Invalid credentials');

    console.log('[SERVICE] Verificando se conta está confirmada...');
    if (!client.isConfirmed) throw new Error('Please confirm your email first');

    console.log('[SERVICE] Validando senha...');
    const isPasswordValid = await bcryptjs.compare(password, client.password);
    if (!isPasswordValid) throw new Error('Invalid credentials');

    console.log('[SERVICE] Gerando tokens JWT...');
    const tokenPayload = { 
      clientId: client.id,
      email: client.contactEmail,
      role: 'client'
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...clientData } = client.toJSON();
    return {
      ...clientData,
      token,
      refreshToken
    };
  } catch (error) {
    console.error('[SERVICE] Erro durante login:', error);
    throw error;
  }
};

// Get client by ID (without password)
export const getClientById = async (id) => {
  console.log('[SERVICE] Buscando cliente por ID:', id);
  
  try {
    const client = await Client.findByPk(id);
    if (!client) {
      console.log('[SERVICE] Cliente não encontrado');
      return null;
    }
    
    const { password, ...clientData } = client.toJSON();
    return clientData;
  } catch (error) {
    console.error('[SERVICE] Erro ao buscar cliente:', error);
    throw error;
  }
};
