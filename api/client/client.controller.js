import * as clientService from './client.service.js';

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

    await clientService.registerClient({ 
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
    
    const result = await clientService.confirmClient(token);
    
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
    
    const client = await clientService.loginClient(contactEmail, password);
    
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
    const client = await clientService.getClientById(req.client.id);
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

// Request password reset
export const forgotPassword = async (req, res) => {
  console.log('🔵 [FORGOT_PASSWORD] Iniciando solicitação de reset de senha...');
  console.log('🔵 [FORGOT_PASSWORD] Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { contactEmail } = req.body;
    console.log('🔵 [FORGOT_PASSWORD] Email recebido:', contactEmail);
    
    await clientService.requestPasswordReset(contactEmail);
    
    console.log('🟢 [FORGOT_PASSWORD] Solicitação processada com sucesso');
    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('🔴 [FORGOT_PASSWORD] Erro na solicitação:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  console.log('🔵 [RESET_PASSWORD] Iniciando reset de senha...');
  console.log('🔵 [RESET_PASSWORD] Parâmetros recebidos:', req.params);
  console.log('🔵 [RESET_PASSWORD] Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    console.log('🔵 [RESET_PASSWORD] Token recebido:', token ? '***TOKEN_PRESENTE***' : 'TOKEN_AUSENTE');
    console.log('🔵 [RESET_PASSWORD] Nova senha:', password ? '***SENHA_PRESENTE***' : 'SENHA_AUSENTE');
    
    const result = await clientService.resetPasswordWithToken(token, password);
    
    console.log('🟢 [RESET_PASSWORD] Senha resetada com sucesso');
    res.json({ 
      message: 'Password reset successfully! You can now login with your new password.',
      clientId: result.clientId
    });
  } catch (error) {
    console.error('🔴 [RESET_PASSWORD] Erro no reset:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Validate reset token
export const validateResetToken = async (req, res) => {
  console.log('🔵 [VALIDATE_RESET_TOKEN] Validando token de reset...');
  console.log('🔵 [VALIDATE_RESET_TOKEN] Parâmetros recebidos:', req.params);
  
  try {
    const { token } = req.params;
    console.log('🔵 [VALIDATE_RESET_TOKEN] Token recebido:', token ? '***TOKEN_PRESENTE***' : 'TOKEN_AUSENTE');
    
    const isValid = await clientService.validatePasswordResetToken(token);
    
    if (isValid) {
      console.log('🟢 [VALIDATE_RESET_TOKEN] Token válido');
      res.json({ valid: true, message: 'Token is valid' });
    } else {
      console.log('🔴 [VALIDATE_RESET_TOKEN] Token inválido ou expirado');
      res.status(400).json({ valid: false, message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('🔴 [VALIDATE_RESET_TOKEN] Erro na validação:', error.message);
    res.status(400).json({ valid: false, message: error.message });
  }
};

export default {
  register,
  confirm,
  login,
  getClient,
  forgotPassword,
  resetPassword,
  validateResetToken
};
