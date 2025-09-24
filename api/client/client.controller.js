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
  console.log('🔵 [REGISTER] Iniciando processo de registro...');
  console.log('🔵 [REGISTER] Headers:', req.headers);
  console.log('🔵 [REGISTER] Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { companyName, contactEmail, password, industry, contactName, phone } = req.body;
    
    console.log('🔵 [REGISTER] Dados extraídos:', {
      companyName,
      contactEmail: contactEmail ? '***EMAIL_PRESENTE***' : 'EMAIL_AUSENTE',
      password: password ? '***SENHA_PRESENTE***' : 'SENHA_AUSENTE',
      industry,
      contactName,
      phone
    });

    await registerClient({ 
      companyName, 
      contactEmail, 
      password, 
      industry,
      contactName,
      phone 
    });
    
    console.log('🟢 [REGISTER] Registro concluído com sucesso');
    res.status(201).json({ message: 'Registration successful! Please check your email.' });
  } catch (error) {
    console.error('🔴 [REGISTER] Erro no registro:', error.message);
    console.error('🔴 [REGISTER] Stack trace:', error.stack);
    res.status(400).json({ message: error.message });
  }
};

// Email confirmation endpoint
export const confirm = async (req, res) => {
  console.log('🔵 [CONFIRM] Iniciando confirmação de email...');
  console.log('🔵 [CONFIRM] Parâmetros recebidos:', req.params);
  
  try {
    const { token } = req.params;
    console.log('🔵 [CONFIRM] Token recebido:', token ? '***TOKEN_PRESENTE***' : 'TOKEN_AUSENTE');
    
    const result = await confirmClient(token);
    
    console.log('🟢 [CONFIRM] Confirmação concluída com sucesso');
    res.json({ 
      message: 'Account confirmed successfully!',
      accessToken: result.accessToken ? '***TOKEN_GERADO***' : 'TOKEN_AUSENTE',
      refreshToken: result.refreshToken ? '***REFRESH_TOKEN_GERADO***' : 'REFRESH_TOKEN_AUSENTE'
    });
  } catch (error) {
    console.error('🔴 [CONFIRM] Erro na confirmação:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Client authentication
export const login = async (req, res) => {
  console.log('🔵 [LOGIN] Iniciando processo de login...');
  console.log('🔵 [LOGIN] Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { contactEmail, password } = req.body;
    console.log('🔵 [LOGIN] Tentativa de login para:', contactEmail);
    
    const client = await loginClient(contactEmail, password);
    
    console.log('🟢 [LOGIN] Login realizado com sucesso para:', contactEmail);
    res.json(client);
  } catch (error) {
    console.error('🔴 [LOGIN] Erro no login:', error.message);
    console.error('🔴 [LOGIN] Stack trace:', error.stack);
    res.status(401).json({ message: error.message });
  }
};

// Get client profile
export const getClient = async (req, res) => {
  console.log('🔵 [GET_CLIENT] Buscando perfil do cliente...');
  console.log('🔵 [GET_CLIENT] Client ID da requisição:', req.client?.id);
  
  try {
    const client = await getClientById(req.client.id);
    if (!client) {
      console.log('🟡 [GET_CLIENT] Cliente não encontrado');
      return res.status(404).json({ message: 'Client not found' });
    }
    
    console.log('🟢 [GET_CLIENT] Perfil encontrado:', { 
      id: client.id, 
      companyName: client.companyName,
      email: client.contactEmail 
    });
    res.json(client);
  } catch (error) {
    console.error('🔴 [GET_CLIENT] Erro ao buscar cliente:', error.message);
    res.status(500).json({ message: 'Error fetching client info' });
  }
};

// Business logic functions
const registerClient = async (clientData) => {
  console.log('🔵 [REGISTER_CLIENT] Iniciando lógica de registro...');
  console.log('🔵 [REGISTER_CLIENT] Dados recebidos:', clientData);

  const { companyName, contactName, contactEmail, phone, password, industry } = clientData;

  // Check for existing email or company
  console.log('🔵 [REGISTER_CLIENT] Verificando email e empresa existentes...');
  const [existingClient, existingCompany] = await Promise.all([
    Client.findOne({ where: { contactEmail } }),
    Client.findOne({ where: { companyName } })
  ]);
  
  console.log('🔵 [REGISTER_CLIENT] Resultado da busca:');
  console.log('   - Email existente:', existingClient ? 'SIM' : 'NÃO');
  console.log('   - Empresa existente:', existingCompany ? 'SIM' : 'NÃO');
  
  if (existingClient) throw new Error('Email already registered');
  if (existingCompany) throw new Error('Company already registered');

  // Create new client
  console.log('🔵 [REGISTER_CLIENT] Criando hash da senha...');
  const hashedPassword = await bcryptjs.hash(password, 10);
  const confirmationToken = crypto.randomBytes(20).toString('hex');
  
  console.log('🔵 [REGISTER_CLIENT] Criando cliente no banco...');
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

  console.log('🟢 [REGISTER_CLIENT] Cliente criado com ID:', newClient.id);

  // Send confirmation email
  console.log('🔵 [REGISTER_CLIENT] Preparando email de confirmação...');
  const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
  console.log('🔵 [REGISTER_CLIENT] Caminho do template:', templatePath);
  
  if (!fs.existsSync(templatePath)) {
    console.error('🔴 [REGISTER_CLIENT] Template de email não encontrado!');
    throw new Error('Email template missing');
  }
  
  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  const confirmationUrl = `https://enova-pulse-rwpd.vercel.app/confirm?token=${confirmationToken}`;
  emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

  console.log('🔵 [REGISTER_CLIENT] Configurando transporte de email...');
  console.log('🔵 [REGISTER_CLIENT] FROM:', process.env.EMAIL_USER);
  console.log('🔵 [REGISTER_CLIENT] TO:', contactEmail);
  console.log('🔵 [REGISTER_CLIENT] URL de confirmação:', confirmationUrl);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contactEmail,
      subject: 'Confirm your business registration',
      html: emailTemplate,
    });
    console.log('🟢 [REGISTER_CLIENT] Email enviado com sucesso!');
  } catch (emailError) {
    console.error('🔴 [REGISTER_CLIENT] Erro ao enviar email:', emailError.message);
    throw new Error('Failed to send confirmation email');
  }

  return newClient;
};

const confirmClient = async (token) => {
  console.log('🔵 [CONFIRM_CLIENT] Validando token:', token ? '***TOKEN_PRESENTE***' : 'TOKEN_AUSENTE');
  
  const client = await Client.findOne({ where: { confirmationToken: token } });
  console.log('🔵 [CONFIRM_CLIENT] Cliente encontrado:', client ? 'SIM' : 'NÃO');
  
  if (!client) throw new Error('Invalid or expired token');

  // Update client confirmation status
  console.log('🔵 [CONFIRM_CLIENT] Atualizando status de confirmação...');
  client.isConfirmed = true;
  client.confirmationToken = null;
  await client.save();
  console.log('🟢 [CONFIRM_CLIENT] Cliente confirmado com sucesso');

  // Generate JWT tokens
  console.log('🔵 [CONFIRM_CLIENT] Gerando tokens JWT...');
  const tokenPayload = { 
    clientId: client.id,
    email: client.contactEmail,
    role: 'client'
  };
  
  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

  console.log('🔵 [CONFIRM_CLIENT] Tokens gerados com sucesso');
  const { password: _, ...clientData } = client.toJSON();
  
  return { client: clientData, accessToken, refreshToken };
};

const loginClient = async (contactEmail, password) => {
  console.log('🔵 [LOGIN_CLIENT] Buscando cliente por email:', contactEmail);
  
  const client = await Client.findOne({ 
    where: { contactEmail },
    attributes: { include: ['password'] }
  });

  console.log('🔵 [LOGIN_CLIENT] Cliente encontrado:', client ? 'SIM' : 'NÃO');
  if (!client) throw new Error('Invalid credentials');
  
  console.log('🔵 [LOGIN_CLIENT] Email confirmado?:', client.isConfirmed ? 'SIM' : 'NÃO');
  if (!client.isConfirmed) throw new Error('Please confirm your email first');

  // Validate password
  console.log('🔵 [LOGIN_CLIENT] Validando senha...');
  const isPasswordValid = await bcryptjs.compare(password, client.password);
  console.log('🔵 [LOGIN_CLIENT] Senha válida?:', isPasswordValid ? 'SIM' : 'NÃO');
  
  if (!isPasswordValid) {
    console.log('🔴 [LOGIN_CLIENT] Senha inválida - incrementando tentativas...');
    await client.update({ 
      loginAttempts: (client.loginAttempts || 0) + 1,
      lastFailedAttempt: new Date()
    });
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  console.log('🔵 [LOGIN_CLIENT] Gerando tokens...');
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

  console.log('🔵 [LOGIN_CLIENT] Atualizando último login...');
  await client.update({ 
    lastLogin: new Date(),
    loginAttempts: 0
  });

  const { password: _, ...clientData } = client.toJSON();
  console.log('🟢 [LOGIN_CLIENT] Login realizado com sucesso');
  
  return { ...clientData, token, refreshToken };
};

const getClientById = async (id) => {
  console.log('🔵 [GET_CLIENT_BY_ID] Buscando cliente por ID:', id);
  
  const client = await Client.findByPk(id);
  console.log('🔵 [GET_CLIENT_BY_ID] Cliente encontrado:', client ? 'SIM' : 'NÃO');
  
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
