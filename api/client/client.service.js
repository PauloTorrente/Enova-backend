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
  console.log('🔵 [SERVICE - REGISTER] Iniciando registro de cliente...');
  console.log('🔵 [SERVICE - REGISTER] Dados recebidos:', {
    companyName: clientData.companyName,
    contactEmail: clientData.contactEmail ? '***EMAIL_PRESENTE***' : 'EMAIL_AUSENTE',
    contactName: clientData.contactName,
    phone: clientData.phone,
    industry: clientData.industry,
    password: clientData.password ? '***SENHA_PRESENTE***' : 'SENHA_AUSENTE'
  });

  try {
    const { companyName, contactName, contactEmail, phone, password, industry } = clientData;

    // Check if email already exists
    console.log('🔵 [SERVICE - REGISTER] Verificando se email já existe...');
    const existingClient = await Client.findOne({ where: { contactEmail } });
    console.log('🔵 [SERVICE - REGISTER] Resultado busca por email:', existingClient ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    
    if (existingClient) {
      console.warn('⚠️ [SERVICE - REGISTER] Email já registrado:', contactEmail);
      throw new Error('Email already registered');
    }

    // Check if company already exists
    console.log('🔵 [SERVICE - REGISTER] Verificando se empresa já existe...');
    const existingCompany = await Client.findOne({ where: { companyName } });
    console.log('🔵 [SERVICE - REGISTER] Resultado busca por empresa:', existingCompany ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
    
    if (existingCompany) {
      console.warn('⚠️ [SERVICE - REGISTER] Empresa já registrada:', companyName);
      throw new Error('Company already registered');
    }

    // Hash password and create confirmation token
    console.log('🔵 [SERVICE - REGISTER] Criando hash da senha...');
    const hashedPassword = await bcryptjs.hash(password, 10);
    const confirmationToken = crypto.randomBytes(20).toString('hex');
    console.log('🔵 [SERVICE - REGISTER] Token de confirmação gerado:', confirmationToken ? '***TOKEN_GERADO***' : 'TOKEN_FALHO');
    
    // Create new client
    console.log('🔵 [SERVICE - REGISTER] Criando cliente no banco...');
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

    console.log('🟢 [SERVICE - REGISTER] Cliente criado com ID:', newClient.id);

    // Send confirmation email
    console.log('🔵 [SERVICE - REGISTER] Preparando envio de email...');
    const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
    console.log('🔵 [SERVICE - REGISTER] Caminho do template:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      console.error('❌ [SERVICE - REGISTER] Template de email não encontrado!');
      throw new Error('Email template not found');
    }
    
    let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
    const confirmationUrl = `https://enova-pulse-rwpd.vercel.app/confirm?token=${confirmationToken}`;
    emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

    console.log('🔵 [SERVICE - REGISTER] Configurando email...');
    console.log('   - FROM:', process.env.EMAIL_USER);
    console.log('   - TO:', contactEmail);
    console.log('   - SUBJECT: Confirm your business registration');
    console.log('   - URL:', confirmationUrl);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contactEmail,
        subject: 'Confirm your business registration',
        html: emailTemplate,
      });
      console.log('🟢 [SERVICE - REGISTER] Email enviado com sucesso!');
    } catch (emailError) {
      console.error('❌ [SERVICE - REGISTER] Erro ao enviar email:', emailError.message);
      console.error('❌ [SERVICE - REGISTER] Detalhes do erro:', emailError);
      throw new Error('Failed to send confirmation email');
    }

    console.log('✅ [SERVICE - REGISTER] Cliente registrado com sucesso');
    return newClient;
  } catch (error) {
    console.error(`❌ [SERVICE - REGISTER] Erro no registro: ${error.message}`);
    console.error(`❌ [SERVICE - REGISTER] Stack trace: ${error.stack}`);
    throw error;
  }
};

// Confirm account and generate tokens
export const confirmClient = async (token) => {
  console.log('🔵 [SERVICE - CONFIRM] Iniciando confirmação de conta...');
  console.log('🔵 [SERVICE - CONFIRM] Token recebido:', token ? '***TOKEN_PRESENTE***' : 'TOKEN_AUSENTE');

  try {
    const client = await Client.findOne({ where: { confirmationToken: token } });
    console.log('🔵 [SERVICE - CONFIRM] Cliente encontrado:', client ? `SIM (ID: ${client.id})` : 'NÃO');
    
    if (!client) {
      console.warn('⚠️ [SERVICE - CONFIRM] Token inválido ou expirado');
      throw new Error('Invalid or expired token');
    }

    // Confirm account
    console.log('🔵 [SERVICE - CONFIRM] Confirmando conta do cliente...');
    client.isConfirmed = true;
    client.confirmationToken = null;
    await client.save();
    console.log('🟢 [SERVICE - CONFIRM] Conta confirmada com sucesso');

    // Generate tokens
    console.log('🔵 [SERVICE - CONFIRM] Gerando tokens JWT...');
    const tokenPayload = { 
      clientId: client.id,
      email: client.contactEmail,
      role: 'client'
    };
    
    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('🔵 [SERVICE - CONFIRM] Tokens gerados com sucesso');

    const { password: _, ...clientData } = client.toJSON();
    
    console.log('✅ [SERVICE - CONFIRM] Conta confirmada com sucesso');
    return {
      client: clientData,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error(`❌ [SERVICE - CONFIRM] Erro na confirmação: ${error.message}`);
    throw error;
  }
};

// Get client by email (without password)
export const getClientByEmail = async (email) => {
  console.log('🔵 [SERVICE - GET_BY_EMAIL] Buscando cliente por email:', email);
  
  try {
    const client = await Client.findOne({ where: { contactEmail: email } });
    console.log('🔵 [SERVICE - GET_BY_EMAIL] Cliente encontrado:', client ? `SIM (ID: ${client.id})` : 'NÃO');
    
    if (!client) {
      console.log('ℹ️ [SERVICE - GET_BY_EMAIL] Cliente não encontrado');
      return null;
    }
    
    const { password, ...clientData } = client.toJSON();
    console.log('🟢 [SERVICE - GET_BY_EMAIL] Cliente retornado com sucesso');
    return clientData;
  } catch (error) {
    console.error(`❌ [SERVICE - GET_BY_EMAIL] Erro na busca: ${error.message}`);
    throw error;
  }
};

// Authenticate client and generate tokens
export const loginClient = async (contactEmail, password) => {
  console.log('🔵 [SERVICE - LOGIN] Iniciando autenticação...');
  console.log('🔵 [SERVICE - LOGIN] Email:', contactEmail);
  console.log('🔵 [SERVICE - LOGIN] Senha:', password ? '***SENHA_PRESENTE***' : 'SENHA_AUSENTE');

  try {
    // Find client with password
    console.log('🔵 [SERVICE - LOGIN] Buscando cliente no banco...');
    const client = await Client.findOne({ 
      where: { contactEmail },
      attributes: { include: ['password'] }
    });

    console.log('🔵 [SERVICE - LOGIN] Cliente encontrado:', client ? `SIM (ID: ${client.id})` : 'NÃO');
    console.log('🔵 [SERVICE - LOGIN] Email confirmado?:', client?.isConfirmed ? 'SIM' : 'NÃO');

    if (!client) {
      console.warn('⚠️ [SERVICE - LOGIN] Credenciais inválidas - cliente não encontrado');
      throw new Error('Invalid credentials');
    }

    // Check if account is confirmed
    if (!client.isConfirmed) {
      console.warn('⚠️ [SERVICE - LOGIN] Conta não confirmada');
      throw new Error('Please confirm your email first');
    }

    // Verify password
    console.log('🔵 [SERVICE - LOGIN] Verificando senha...');
    const isPasswordValid = await bcryptjs.compare(password, client.password);
    console.log('🔵 [SERVICE - LOGIN] Senha válida?:', isPasswordValid ? 'SIM' : 'NÃO');
    
    if (!isPasswordValid) {
      console.warn('⚠️ [SERVICE - LOGIN] Senha inválida - atualizando tentativas...');
      await client.update({ 
        loginAttempts: (client.loginAttempts || 0) + 1,
        lastFailedAttempt: new Date()
      });
      console.warn('⚠️ [SERVICE - LOGIN] Tentativas de login:', client.loginAttempts);
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    console.log('🔵 [SERVICE - LOGIN] Gerando tokens JWT...');
    const tokenPayload = { 
      clientId: client.id,
      email: client.contactEmail,
      role: 'client',
      company: client.companyName
    };

    console.log('🔵 [SERVICE - LOGIN] Payload do token:', tokenPayload);
    
    const [token, refreshToken] = await Promise.all([
      jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' }),
      jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' })
    ]);

    console.log('🔵 [SERVICE - LOGIN] Tokens gerados com sucesso');

    // Update last login
    console.log('🔵 [SERVICE - LOGIN] Atualizando último login...');
    await client.update({ 
      lastLogin: new Date(),
      loginAttempts: 0
    });

    const { password: _, ...clientData } = client.toJSON();
    
    console.log('✅ [SERVICE - LOGIN] Login realizado com sucesso');
    return {
      ...clientData,
      token,
      refreshToken
    };

  } catch (error) {
    console.error(`❌ [SERVICE - LOGIN] Erro no login: ${error.message}`);
    console.error(`❌ [SERVICE - LOGIN] Stack trace: ${error.stack}`);
    throw error;
  }
};

// Get client by ID (without password)
export const getClientById = async (id) => {
  console.log('🔵 [SERVICE - GET_BY_ID] Buscando cliente por ID:', id);
  
  try {
    const client = await Client.findByPk(id);
    console.log('🔵 [SERVICE - GET_BY_ID] Cliente encontrado:', client ? `SIM (ID: ${client.id})` : 'NÃO');
    
    if (!client) {
      console.log('ℹ️ [SERVICE - GET_BY_ID] Cliente não encontrado');
      return null;
    }
    
    const { password, ...clientData } = client.toJSON();
    console.log('🟢 [SERVICE - GET_BY_ID] Cliente retornado com sucesso');
    return clientData;
  } catch (error) {
    console.error(`❌ [SERVICE - GET_BY_ID] Erro na busca: ${error.message}`);
    throw error;
  }
};
