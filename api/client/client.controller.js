import * as clientService from './client.service.js';
import crypto from 'crypto';

// Registrar novo cliente empresarial
export const register = async (req, res) => {
  console.log('[CONTROLLER] Recebendo dados do frontend:', req.body);
  
  const { companyName, contactEmail, password, industry, contactName, phone } = req.body;

  try {
    console.log('[CONTROLLER] Chamando service com dados:', { 
      companyName, 
      contactEmail, 
      password: '******', // Esconde a senha por segurança
      industry,
      contactName,
      phone 
    });
    
    await clientService.registerClient({ 
      companyName, 
      contactEmail, 
      password, 
      industry,
      contactName,
      phone 
    });
    
    console.log('[CONTROLLER] Registro concluído com sucesso');
    res.status(201).json({
      message: 'Registro empresarial realizado! Verifique seu email para confirmar sua conta.'
    });
  } catch (error) {
    console.error('[CONTROLLER] Erro no registro:', {
      message: error.message,
      stack: error.stack // Adiciona stack trace para debug
    });
    res.status(400).json({ 
      message: error.message 
    });
  }
};

// Confirmar registro do cliente
export const confirm = async (req, res) => {
  const { token } = req.params;
  console.log('[CONTROLLER] Recebendo token de confirmação:', token);

  try {
    console.log('[CONTROLLER] Confirmando conta com token...');
    await clientService.confirmClient(token);
    console.log('[CONTROLLER] Conta confirmada com sucesso');
    res.json({ message: 'Conta empresarial confirmada com sucesso!' });
  } catch (error) {
    console.error('[CONTROLLER] Erro na confirmação:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Login do cliente empresarial
export const login = async (req, res) => {
  // Log inicial com metadados completos da requisição
  console.debug('[AUTH] Iniciando processo de login', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    xForwardedFor: req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    origin: req.headers['origin'],
    body: {
      ...req.body,
      password: req.body.password ? '******' : undefined // Ocultar senha
    }
  });

  const { contactEmail, password } = req.body;

  try {
    // Validação passo a passo com logs detalhados
    console.debug('[AUTH] Validando entrada de dados', {
      step: 'input_validation',
      emailLength: contactEmail?.length,
      passwordLength: password?.length,
      emailFormat: contactEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) : false
    });

    if (!contactEmail || !password) {
      const error = new Error('Email e senha são obrigatórios');
      error.code = 'MISSING_CREDENTIALS';
      console.error('[AUTH] Credenciais ausentes', {
        errorDetails: {
          code: error.code,
          emailProvided: !!contactEmail,
          passwordProvided: !!password,
          requestBodyKeys: Object.keys(req.body)
        }
      });
      throw error;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      const error = new Error('Formato de email inválido');
      error.code = 'INVALID_EMAIL_FORMAT';
      console.error('[AUTH] Email inválido', {
        emailProvided: contactEmail,
        validationRegex: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
        isValid: false
      });
      throw error;
    }

    // DEBUG ADICIONADO: Verificar status da conta antes de tentar login
    console.debug('[AUTH] Verificando status da conta no banco de dados...');
    const tempClientCheck = await clientService.getClientByEmail(contactEmail);
    console.debug('[AUTH] Detalhes da conta recém-criada:', {
      email: contactEmail,
      accountStatus: {
        isConfirmed: tempClientCheck?.isConfirmed,
        createdAt: tempClientCheck?.createdAt,
        passwordHash: tempClientCheck?.password ? 'hash-present' : 'hash-missing',
        confirmationToken: tempClientCheck?.confirmationToken ? 'present' : 'missing'
      }
    });

    // Início do processo de autenticação
    console.debug('[AUTH] Iniciando autenticação no service', {
      step: 'service_call',
      email: contactEmail,
      passwordHash: password ? crypto.createHash('sha256').update(password).digest('hex') : 'null'
    });

    const startTime = process.hrtime();
    const client = await clientService.loginClient(contactEmail, password);
    const hrtime = process.hrtime(startTime);
    const executionTime = hrtime[0] * 1000 + hrtime[1] / 1000000;

    // Log de sucesso detalhado
    console.info('[AUTH] Login bem-sucedido', {
      status: 'success',
      client: {
        id: client.id,
        email: client.contactEmail,
        company: client.companyName,
        isVerified: client.isVerified,
        lastLogin: client.lastLogin
      },
      performance: {
        executionTime: `${executionTime.toFixed(2)}ms`,
        dbQueryTime: client._debug?.dbQueryTime,
        tokenGenTime: client._debug?.tokenGenTime
      },
      security: {
        tokenLength: client.token?.length,
        refreshToken: client.refreshToken ? '******' : null
      }
    });

    // Resposta com dados de debug (apenas em desenvolvimento)
    const response = {
      token: client.token,
      refreshToken: client.refreshToken,
      client: {
        id: client.id,
        companyName: client.companyName,
        contactEmail: client.contactEmail
      }
    };

    if (process.env.NODE_ENV === 'development') {
      response._debug = {
        timestamp: new Date().toISOString(),
        executionTime,
        dbOperations: client._debug?.dbOperations,
        steps: [
          'input_validation',
          'service_call',
          'db_query',
          'password_compare',
          'token_generation'
        ],
        accountStatus: {
          isConfirmed: tempClientCheck?.isConfirmed,
          createdAt: tempClientCheck?.createdAt
        }
      };
    }

    res.json(response);

  } catch (error) {
    // Log de erro completo
    const errorLog = {
      status: 'failed',
      error: {
        name: error.name,
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack.split('\n').slice(0, 3) // Mostrar apenas as 3 primeiras linhas do stack
      },
      input: {
        email: contactEmail,
        passwordLength: password?.length
      },
      context: {
        isVerified: error.isVerified,
        isLocked: error.isLocked,
        attempts: error.attempts,
        accountStatus: {
          isConfirmed: error.client?.isConfirmed,
          exists: !!error.client
        }
      },
      timestamp: new Date().toISOString()
    };

    // Classificação de erros para estatísticas
    if (error.message.includes('senha')) {
      errorLog.error.type = 'INVALID_CREDENTIALS';
      console.warn('[AUTH] Falha de autenticação - Credenciais inválidas', errorLog);
    } else if (error.message.includes('confirm')) {
      errorLog.error.type = 'UNVERIFIED_ACCOUNT';
      console.warn('[AUTH] Falha de autenticação - Conta não verificada', errorLog);
    } else {
      errorLog.error.type = 'AUTHENTICATION_FAILURE';
      console.error('[AUTH] Falha no processo de autenticação', errorLog);
    }

    // Resposta de erro com detalhes
    const statusCode = error.statusCode || 401;
    const clientResponse = {
      message: error.message,
      code: error.code
    };

    if (process.env.NODE_ENV === 'development') {
      clientResponse._debug = {
        timestamp: errorLog.timestamp,
        errorType: errorLog.error.type,
        stack: errorLog.error.stack,
        accountStatus: errorLog.context.accountStatus
      };
    }

    res.status(statusCode).json(clientResponse);
  }
};

// Obter informações do cliente
export const getClient = async (req, res) => {
  const clientId = req.client.id;
  console.log('[CONTROLLER] Buscando dados do cliente ID:', clientId);

  try {
    console.log('[CONTROLLER] Consultando service...');
    const client = await clientService.getClientById(clientId);
    
    if (!client) {
      console.warn('[CONTROLLER] Cliente não encontrado ID:', clientId);
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    console.log('[CONTROLLER] Dados encontrados para ID:', clientId);
    res.json(client);
  } catch (error) {
    console.error('[CONTROLLER] Erro ao buscar cliente:', {
      id: clientId,
      error: error.message
    });
    res.status(500).json({ message: 'Erro ao buscar informações do cliente' });
  }
};
