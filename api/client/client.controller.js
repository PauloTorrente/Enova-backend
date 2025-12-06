import * as clientService from './client.service.js';
import Client from './client.model.js';
import Survey from '../surveys/surveys.model.js';
import Result from '../results/results.model.js';
import User from '../users/users.model.js';
import { sequelize } from '../../config/database.js';

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

// Get all clients (Client Admin only)
export const getAllClients = async (req, res) => {
  console.log('🔵 [GET_ALL_CLIENTS] Client admin requesting all clients');
  console.log('🔵 [GET_ALL_CLIENTS] Admin ID:', req.client?.id, 'Role:', req.client?.role);
  
  try {
    // Verificar se é realmente um client_admin
    if (req.client.role !== 'client_admin') {
      console.log('🔴 [GET_ALL_CLIENTS] Access denied. Admin privileges required.');
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    console.log('🔵 [GET_ALL_CLIENTS] Fetching all clients from database...');
    const clients = await Client.findAll({
      attributes: [
        'id', 'companyName', 'contactName', 'contactEmail',
        'industry', 'role', 'createdAt', 'lastLogin',
        'isConfirmed', 'phoneNumber'
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`🟢 [GET_ALL_CLIENTS] Found ${clients.length} clients`);
    
    // Log resumido dos clientes encontrados
    clients.slice(0, 3).forEach(client => {
      console.log(`📋 [GET_ALL_CLIENTS] Client sample:`, {
        id: client.id,
        company: client.companyName,
        email: client.contactEmail,
        role: client.role
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'All clients retrieved successfully',
      clients: clients,
      metadata: {
        totalClients: clients.length,
        adminId: req.client.id,
        adminCompany: req.client.companyName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('🔴 [GET_ALL_CLIENTS] Error:', error.message);
    console.error('🔴 [GET_ALL_CLIENTS] Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get admin dashboard with global statistics
export const getAdminDashboard = async (req, res) => {
  console.log('📊 [ADMIN_DASHBOARD] Client admin requesting dashboard');
  console.log('📊 [ADMIN_DASHBOARD] Admin ID:', req.client?.id, 'Company:', req.client?.companyName);
  
  try {
    // Verificar se é realmente um client_admin
    if (req.client.role !== 'client_admin') {
      console.log('🔴 [ADMIN_DASHBOARD] Admin privileges required');
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    
    console.log('📊 [ADMIN_DASHBOARD] Calculating global statistics...');
    
    // Estatísticas gerais da plataforma
    const [
      totalSurveys,
      totalClients,
      totalResponses,
      totalUsers
    ] = await Promise.all([
      Survey.count(),
      Client.count(),
      Result.count(),
      User.count()
    ]);
    
    console.log('📊 [ADMIN_DASHBOARD] Statistics calculated:', {
      totalSurveys,
      totalClients,
      totalResponses,
      totalUsers
    });
    
    // Surveys mais recentes (de todos os clientes)
    console.log('📊 [ADMIN_DASHBOARD] Fetching recent surveys...');
    const recentSurveys = await Survey.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Client,
        as: 'client',
        attributes: ['id', 'companyName', 'contactEmail']
      }]
    });
    
    // Clientes mais ativos (com mais surveys)
    console.log('📊 [ADMIN_DASHBOARD] Fetching active clients...');
    const activeClients = await Client.findAll({
      attributes: [
        'id', 'companyName', 'contactEmail',
        [sequelize.fn('COUNT', sequelize.col('surveys.id')), 'surveyCount'],
        [sequelize.fn('MAX', sequelize.col('surveys.createdAt')), 'lastSurveyDate']
      ],
      include: [{
        model: Survey,
        as: 'surveys',
        attributes: [],
        required: false
      }],
      group: ['Client.id'],
      order: [[sequelize.literal('surveyCount'), 'DESC']],
      limit: 5
    });
    
    // Surveys com mais respostas
    console.log('📊 [ADMIN_DASHBOARD] Fetching surveys with most responses...');
    const popularSurveys = await Survey.findAll({
      attributes: [
        'id', 'title', 'clientId',
        [sequelize.fn('COUNT', sequelize.col('results.id')), 'responseCount']
      ],
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['companyName']
        },
        {
          model: Result,
          as: 'results',
          attributes: [],
          required: false
        }
      ],
      group: ['Survey.id'],
      order: [[sequelize.literal('responseCount'), 'DESC']],
      limit: 5
    });
    
    console.log('📊 [ADMIN_DASHBOARD] Dashboard data retrieved successfully');
    
    res.status(200).json({
      success: true,
      message: 'Admin dashboard retrieved successfully',
      dashboard: {
        statistics: {
          totalSurveys,
          totalClients,
          totalResponses,
          totalUsers,
          averageResponsesPerSurvey: totalSurveys > 0 ? (totalResponses / totalSurveys).toFixed(1) : 0,
          averageSurveysPerClient: totalClients > 0 ? (totalSurveys / totalClients).toFixed(1) : 0
        },
        recentSurveys,
        activeClients,
        popularSurveys,
        clientAdmin: {
          id: req.client.id,
          companyName: req.client.companyName,
          contactEmail: req.client.contactEmail,
          role: req.client.role
        },
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ [ADMIN_DASHBOARD] Dashboard sent successfully');
    
  } catch (error) {
    console.error('❌ [ADMIN_DASHBOARD] Error:', error.message);
    console.error('❌ [ADMIN_DASHBOARD] Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching admin dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        adminId: req.client?.id
      } : undefined
    });
  }
};

// Get client details by ID (Client Admin only)
export const getClientDetails = async (req, res) => {
  console.log('🔵 [GET_CLIENT_DETAILS] Client admin requesting client details');
  console.log('🔵 [GET_CLIENT_DETAILS] Admin ID:', req.client?.id, 'Target Client ID:', req.params.clientId);
  
  try {
    // Verificar se é realmente um client_admin
    if (req.client.role !== 'client_admin') {
      console.log('🔴 [GET_CLIENT_DETAILS] Access denied. Admin privileges required.');
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const { clientId } = req.params;
    
    if (!clientId) {
      console.log('🔴 [GET_CLIENT_DETAILS] Client ID is required');
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    console.log('🔵 [GET_CLIENT_DETAILS] Fetching client details...');
    
    // Buscar cliente com todos os dados
    const client = await Client.findByPk(clientId, {
      attributes: [
        'id', 'companyName', 'contactName', 'contactEmail',
        'phoneNumber', 'industry', 'role', 'isConfirmed',
        'createdAt', 'lastLogin', 'loginAttempts'
      ]
    });
    
    if (!client) {
      console.log('🟡 [GET_CLIENT_DETAILS] Client not found');
      return res.status(404).json({ message: 'Client not found' });
    }
    
    console.log('🔵 [GET_CLIENT_DETAILS] Fetching client surveys...');
    
    // Buscar surveys do cliente
    const clientSurveys = await Survey.findAll({
      where: { clientId: clientId },
      attributes: ['id', 'title', 'status', 'createdAt', 'responseLimit'],
      order: [['createdAt', 'DESC']]
    });
    
    // Estatísticas do cliente
    const surveyIds = clientSurveys.map(survey => survey.id);
    const totalClientResponses = surveyIds.length > 0 
      ? await Result.count({ where: { surveyId: surveyIds } })
      : 0;
    
    console.log(`🟢 [GET_CLIENT_DETAILS] Client details retrieved:`, {
      clientId: client.id,
      companyName: client.companyName,
      surveysCount: clientSurveys.length,
      responsesCount: totalClientResponses
    });
    
    res.status(200).json({
      success: true,
      message: 'Client details retrieved successfully',
      client: client,
      surveys: clientSurveys,
      statistics: {
        totalSurveys: clientSurveys.length,
        totalResponses: totalClientResponses,
        activeSurveys: clientSurveys.filter(s => s.status === 'active').length,
        completedSurveys: clientSurveys.filter(s => s.status === 'completed').length
      },
      metadata: {
        requestedBy: {
          adminId: req.client.id,
          adminCompany: req.client.companyName
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('🔴 [GET_CLIENT_DETAILS] Error:', error.message);
    console.error('🔴 [GET_CLIENT_DETAILS] Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching client details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  register,
  confirm,
  login,
  getClient,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getAllClients,
  getAdminDashboard,
  getClientDetails
};
