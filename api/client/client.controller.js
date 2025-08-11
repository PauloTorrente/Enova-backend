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
  const { contactEmail, password } = req.body;
  console.log('[CONTROLLER] Tentativa de login para:', contactEmail);

  try {
    console.log('[CONTROLLER] Validando credenciais...');
    const client = await clientService.loginClient(contactEmail, password);
    console.log('[CONTROLLER] Login bem-sucedido para ID:', client.id);
    res.json(client);
  } catch (error) {
    console.error('[CONTROLLER] Falha no login:', {
      email: contactEmail,
      error: error.message
    });
    res.status(401).json({ message: error.message });
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
