import * as clientService from './client.service.js';

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
    const { 
      client, 
      accessToken, 
      refreshToken 
    } = await clientService.confirmClient(token);

    console.log('[CONTROLLER] Conta confirmada com sucesso. Tokens gerados:', {
      clientId: client.id,
      tokensGenerated: !!accessToken && !!refreshToken
    });

    res.json({ 
      message: 'Conta empresarial confirmada com sucesso!',
      accessToken,
      refreshToken,
      client: {
        id: client.id,
        companyName: client.companyName,
        contactEmail: client.contactEmail,
        contactName: client.contactName,
        industry: client.industry
      }
    });
  } catch (error) {
    console.error('[CONTROLLER] Erro na confirmação:', {
      message: error.message,
      stack: error.stack
    });
    res.status(400).json({ message: error.message });
  }
};

// Login do cliente empresarial
export const login = async (req, res) => {
  const { contactEmail, password } = req.body;
  console.log('[CONTROLLER] Tentativa de login iniciada', {
    email: contactEmail,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  try {
    console.log('[CONTROLLER] Validando formato do email...');
    if (!contactEmail || !password) {
      console.error('[CONTROLLER] Credenciais ausentes', {
        emailProvided: !!contactEmail,
        passwordProvided: !!password
      });
      throw new Error('Email e senha são obrigatórios');
    }

    console.log('[CONTROLLER] Chamando service de login...');
    const startTime = process.hrtime();
    const client = await clientService.loginClient(contactEmail, password);
    const hrtime = process.hrtime(startTime);
    const executionTime = hrtime[0] * 1000 + hrtime[1] / 1000000;

    console.log('[CONTROLLER] Login bem-sucedido', {
      clientId: client.id,
      email: client.contactEmail,
      executionTime: `${executionTime.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

    res.json({
      ...client,
      _debug: {
        timestamp: new Date().toISOString(),
        executionTime
      }
    });
  } catch (error) {
    console.error('[CONTROLLER] Falha no login', {
      email: contactEmail,
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      },
      timestamp: new Date().toISOString(),
      statusCode: error.statusCode || 401
    });

    res.status(error.statusCode || 401).json({ 
      message: error.message,
      _debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    });
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
