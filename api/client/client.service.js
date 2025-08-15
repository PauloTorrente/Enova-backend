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
    console.debug('[REGISTER] Hash gerado:', hashedPassword);
    
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

// Confirm client account using token and generate JWT tokens
export const confirmClient = async (token) => {
  console.log('[SERVICE] Confirmando conta com token:', token);
  
  try {
    const client = await Client.findOne({ where: { confirmationToken: token } });
    if (!client) throw new Error('Invalid or expired token');

    console.log('[SERVICE] Confirmando conta do cliente ID:', client.id);
    client.isConfirmed = true;
    client.confirmationToken = null;
    await client.save();

    // Generate JWT tokens after confirmation
    console.log('[SERVICE] Gerando tokens JWT para o cliente ID:', client.id);
    const tokenPayload = { 
      clientId: client.id,
      email: client.contactEmail,
      role: 'client'
    };
    
    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...clientData } = client.toJSON();
    
    return {
      client: clientData,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('[SERVICE] Erro ao confirmar conta:', error);
    throw error;
  }
};

// Get client by email (without password)
export const getClientByEmail = async (email) => {
  console.log('[SERVICE] Buscando cliente por email:', email);
  
  try {
    const client = await Client.findOne({ where: { contactEmail: email } });
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

// Client login with JWT generation (with enhanced debug logging)
export const loginClient = async (contactEmail, password) => {
  const debugLog = {
    timestamp: new Date().toISOString(),
    operation: 'client_login',
    stage: 'init',
    email: contactEmail,
    metadata: {
      passwordLength: password?.length,
      inputSanitized: {
        email: contactEmail?.replace(/(.{3}).*@/, '$1***@'), // Ofusca parte do email
        password: password ? '******' : null
      }
    }
  };

  console.debug('[AUTH_SERVICE] Iniciando processo de login', debugLog);

  try {
    // STAGE 1: Busca do cliente no banco de dados
    debugLog.stage = 'db_lookup';
    debugLog.dbQuery = {
      startTime: process.hrtime()
    };

    console.debug('[AUTH_SERVICE] Buscando cliente no banco de dados', debugLog);
    const client = await Client.findOne({ 
      where: { contactEmail },
      attributes: { include: ['password'] } // Garante que a senha seja incluída
    });

    console.debug('[AUTH_SERVICE] Detalhes do cliente encontrado:', {
      id: client?.id,
      isConfirmed: client?.isConfirmed,
      password: client?.password ? 'hash-present' : 'hash-missing',
      createdAt: client?.createdAt,
      updatedAt: client?.updatedAt
    });

    debugLog.dbQuery.endTime = process.hrtime(debugLog.dbQuery.startTime);
    debugLog.dbQuery.durationMs = 
      debugLog.dbQuery.endTime[0] * 1000 + debugLog.dbQuery.endTime[1] / 1000000;

    if (!client) {
      debugLog.stage = 'client_not_found';
      debugLog.error = {
        code: 'CLIENT_NOT_FOUND',
        message: 'No client found with provided email'
      };
      console.warn('[AUTH_SERVICE] Cliente não encontrado', debugLog);
      throw new Error('Credenciais inválidas');
    }

    debugLog.client = {
      id: client.id,
      isConfirmed: client.isConfirmed,
      createdAt: client.createdAt,
      lastLogin: client.lastLogin,
      loginAttempts: client.loginAttempts || 0
    };

    // STAGE 2: Verificação de conta confirmada
    debugLog.stage = 'account_verification';
    console.debug('[AUTH_SERVICE] Verificando status da conta', debugLog);

    if (!client.isConfirmed) {
      debugLog.error = {
        code: 'UNCONFIRMED_ACCOUNT',
        message: 'Account email not confirmed'
      };
      console.warn('[AUTH_SERVICE] Conta não confirmada', {
        ...debugLog,
        confirmationToken: client.confirmationToken ? 'present' : 'missing'
      });
      throw new Error('Por favor, confirme seu email primeiro');
    }

    // STAGE 3: Verificação de senha
    debugLog.stage = 'password_verification';
    debugLog.passwordVerification = {
      startTime: process.hrtime(),
      hashAlgorithm: 'bcryptjs',
      saltRounds: 10
    };

    console.debug('[AUTH_SERVICE] Comparação de senha:', {
      inputPassword: crypto.createHash('sha256').update(password).digest('hex'),
      storedPassword: client.password ? `${client.password.substring(0, 10)}...` : 'null'
    });

    const isPasswordValid = await bcryptjs.compare(password, client.password);
    debugLog.passwordVerification.endTime = process.hrtime(debugLog.passwordVerification.startTime);
    debugLog.passwordVerification.durationMs = 
      debugLog.passwordVerification.endTime[0] * 1000 + 
      debugLog.passwordVerification.endTime[1] / 1000000;
    debugLog.passwordVerification.result = isPasswordValid;

    if (!isPasswordValid) {
      debugLog.error = {
        code: 'INVALID_PASSWORD',
        message: 'Password comparison failed'
      };
      
      const encodingTest = {};
      const testEncodings = ['utf8', 'latin1', 'ascii'];
      
      for (const encoding of testEncodings) {
        const encodedPassword = Buffer.from(password, encoding).toString();
        encodingTest[encoding] = await bcryptjs.compare(encodedPassword, client.password);
      }
      
      debugLog.encodingTest = encodingTest;
      console.error('[AUTH_SERVICE] Falha na verificação de senha', debugLog);
      
      await client.update({ 
        loginAttempts: (client.loginAttempts || 0) + 1,
        lastFailedAttempt: new Date()
      });
      
      throw new Error('Credenciais inválidas');
    }

    // STAGE 4: Geração de tokens
    debugLog.stage = 'token_generation';
    debugLog.tokenGeneration = {
      startTime: process.hrtime(),
      jwtSecretPresent: !!process.env.JWT_SECRET,
      accessTokenExpiry: '1h',
      refreshTokenExpiry: '7d'
    };

    console.debug('[AUTH_SERVICE] Gerando tokens JWT', debugLog);
    
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

    debugLog.tokenGeneration.endTime = process.hrtime(debugLog.tokenGeneration.startTime);
    debugLog.tokenGeneration.durationMs = 
      debugLog.tokenGeneration.endTime[0] * 1000 + 
      debugLog.tokenGeneration.endTime[1] / 1000000;
    debugLog.tokenGeneration.tokens = {
      accessToken: token.substring(0, 10) + '...',
      refreshToken: refreshToken.substring(0, 10) + '...'
    };

    // STAGE 5: Atualização do último login
    debugLog.stage = 'client_update';
    await client.update({ 
      lastLogin: new Date(),
      loginAttempts: 0 // Resetar tentativas falhas
    });

    // Preparar resposta
    const { password: _, ...clientData } = client.toJSON();
    
    debugLog.stage = 'complete';
    debugLog.status = 'success';
    console.info('[AUTH_SERVICE] Login realizado com sucesso', debugLog);

    return {
      ...clientData,
      token,
      refreshToken,
      _debug: process.env.NODE_ENV === 'development' ? {
        stages: debugLog.stage,
        timings: {
          dbLookup: debugLog.dbQuery.durationMs,
          passwordVerify: debugLog.passwordVerification.durationMs,
          tokenGen: debugLog.tokenGeneration.durationMs
        }
      } : undefined
    };

  } catch (error) {
    debugLog.stage = 'error_handling';
    debugLog.status = 'failed';
    debugLog.error = {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
      code: error.code || 'UNKNOWN_ERROR'
    };

    if (error.message.includes('Credenciais')) {
      debugLog.error.type = 'AUTH_FAILURE';
      console.warn('[AUTH_SERVICE] Falha de autenticação', debugLog);
    } else if (error.message.includes('confirme')) {
      debugLog.error.type = 'UNCONFIRMED_ACCOUNT';
      console.warn('[AUTH_SERVICE] Conta não confirmada', debugLog);
    } else {
      debugLog.error.type = 'SYSTEM_ERROR';
      console.error('[AUTH_SERVICE] Erro no processo de login', debugLog);
    }

    if (error.name === 'JsonWebTokenError') {
      debugLog.jwtError = {
        secretPresent: !!process.env.JWT_SECRET,
        secretLength: process.env.JWT_SECRET?.length
      };
    }

    if (error.message.includes('Invalid salt version') || 
        error.message.includes('data and hash arguments required')) {
      debugLog.bcryptError = {
        passwordType: typeof password,
        hashPattern: client?.password?.substring(0, 10) + '...'
      };
    }

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
