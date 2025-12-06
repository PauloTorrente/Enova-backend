import * as resultsService from './results.service.js';
import Survey from '../surveys/surveys.model.js';
import { verifyClientAccess, verifyClientAccessWithPrivileges } from './results.access.service.js';
import { processSurveyAnalytics } from './results.analytics.core.service.js'; 
import User from '../users/users.model.js';
import Result from './results.model.js';
import Client from '../client/client.model.js';
import { sequelize } from '../../config/database.js';

// Get ALL surveys from ALL clients - EXCLUSIVE FOR CLIENT_ADMIN
export const getAllSurveys = async (req, res) => {
  try {
    console.log('📋 [ADMIN] Client admin requesting ALL surveys');
    
    // Verificar se é realmente um client_admin
    if (req.client?.role !== 'client_admin') {
      console.log('❌ [ADMIN] Access denied - not a client_admin');
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.',
        clientRole: req.client?.role 
      });
    }
    
    // Buscar TODOS os surveys com informações do cliente
    const surveys = await Survey.findAll({
      include: [{
        model: Client,
        as: 'client',
        attributes: ['id', 'companyName', 'contactEmail', 'contactName', 'industry']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`✅ [ADMIN] Found ${surveys.length} surveys from all clients`);
    
    // Formatar resposta
    const formattedSurveys = surveys.map(survey => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      responseLimit: survey.responseLimit,
      expirationTime: survey.expirationTime,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      client: survey.client ? {
        id: survey.client.id,
        companyName: survey.client.companyName,
        contactEmail: survey.client.contactEmail,
        contactName: survey.client.contactName,
        industry: survey.client.industry
      } : null,
      questionsCount: survey.questions ? 
        (typeof survey.questions === 'string' ? JSON.parse(survey.questions).length : survey.questions.length) 
        : 0
    }));
    
    return res.status(200).json({
      success: true,
      message: 'All surveys retrieved successfully',
      surveys: formattedSurveys,
      metadata: {
        totalSurveys: surveys.length,
        clientAdmin: {
          id: req.client.id,
          companyName: req.client.companyName,
          role: req.client.role
        }
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error fetching all surveys:', error);
    return res.status(500).json({
      message: 'Failed to fetch all surveys',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        adminId: req.client?.id
      } : undefined
    });
  }
};

// Dashboard do Client Admin - ESTATÍSTICAS GERAIS
export const getAdminDashboard = async (req, res) => {
  try {
    console.log('📊 [ADMIN_DASHBOARD] Client admin requesting dashboard');
    
    if (req.client?.role !== 'client_admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    
    // Estatísticas gerais
    const totalSurveys = await Survey.count();
    const totalClients = await Client.count();
    const totalResponses = await Result.count();
    const totalUsers = await User.count();
    
    // Surveys mais recentes
    const recentSurveys = await Survey.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Client,
        as: 'client',
        attributes: ['companyName']
      }]
    });
    
    // Clientes mais ativos (com mais surveys)
    const activeClients = await Client.findAll({
      attributes: [
        'id', 'companyName', 'contactEmail',
        [sequelize.fn('COUNT', sequelize.col('surveys.id')), 'surveyCount']
      ],
      include: [{
        model: Survey,
        as: 'surveys',
        attributes: []
      }],
      group: ['Client.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('surveys.id')), 'DESC']],
      limit: 5
    });
    
    // Surveys com mais respostas
    const popularSurveys = await Survey.findAll({
      attributes: [
        'id', 'title',
        [sequelize.fn('COUNT', sequelize.col('results.id')), 'responseCount']
      ],
      include: [{
        model: Result,
        as: 'results',
        attributes: []
      }, {
        model: Client,
        as: 'client',
        attributes: ['companyName']
      }],
      group: ['Survey.id', 'client.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('results.id')), 'DESC']],
      limit: 5
    });
    
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
        recentSurveys: recentSurveys.map(s => ({
          id: s.id,
          title: s.title,
          clientCompany: s.client?.companyName,
          createdAt: s.createdAt,
          status: s.status
        })),
        activeClients: activeClients.map(c => ({
          id: c.id,
          companyName: c.companyName,
          contactEmail: c.contactEmail,
          surveyCount: c.dataValues.surveyCount
        })),
        popularSurveys: popularSurveys.map(s => ({
          id: s.id,
          title: s.title,
          clientCompany: s.client?.companyName,
          responseCount: s.dataValues.responseCount
        })),
        clientAdmin: {
          id: req.client.id,
          companyName: req.client.companyName,
          role: req.client.role
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN_DASHBOARD] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch admin dashboard',
      error: error.message 
    });
  }
};

// ==============================================
// FUNÇÕES EXISTENTES - MODIFICADAS COM PRIVILÉGIOS
// ==============================================

// Get all responses for a survey - AGORA COM VERIFICAÇÃO DE PRIVILÉGIOS
export const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID required' });
    }
    
    // USAR A NOVA FUNÇÃO COM PRIVILÉGIOS
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    
    const responses = await resultsService.getResponsesBySurvey(surveyId);
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    return res.status(200).json({
      message: 'Responses fetched successfully!',
      responses: responses,
      metadata: {
        clientRole: req.client?.role,
        hasAdminPrivileges: req.client?.role === 'client_admin'
      }
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      message: error.message,
      error: error.message,
      clientRole: req.client?.role
    });
  }
};

// Get responses for specific question - AGORA COM VERIFICAÇÃO DE PRIVILÉGIOS
export const getResponsesByQuestion = async (req, res) => {
  try {
    const { surveyId, question } = req.params;
    
    // USAR A NOVA FUNÇÃO COM PRIVILÉGIOS
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    
    const responses = await resultsService.getResponsesByQuestion(surveyId, question);
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this question.' });
    }

    return res.status(200).json({
      message: 'Responses for the question fetched successfully!',
      responses: responses,
      metadata: {
        clientRole: req.client?.role,
        hasAdminPrivileges: req.client?.role === 'client_admin'
      }
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      message: error.message,
      error: error.message,
      clientRole: req.client?.role
    });
  }
};

// Get responses with user details - AGORA COM VERIFICAÇÃO DE PRIVILÉGIOS
export const getSurveyResponsesWithUserDetails = async (req, res) => {
  const { surveyId } = req.params;
  
  try {
    console.log(`🔍 [CONTROLLER] Starting getSurveyResponsesWithUserDetails for survey: ${surveyId}`);
    console.log(`👤 [CONTROLLER] Client making request:`, req.client?.id, 'Role:', req.client?.role);
    
    // USAR A NOVA FUNÇÃO COM PRIVILÉGIOS
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    
    console.log(`✅ [CONTROLLER] Access verified, fetching responses from service...`);
    
    // Get responses with user details from service layer
    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    
    if (!responses || responses.length === 0) {
      console.log(`❌ [CONTROLLER] No responses found for survey: ${surveyId}`);
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    console.log(`✅ [CONTROLLER] Retrieved ${responses.length} responses from service`);

    // Debug: log raw responses structure before formatting
    console.log('📋 [CONTROLLER] Raw responses structure analysis:');
    responses.slice(0, 3).forEach((r, index) => {
      console.log(`   Response ${index + 1}:`, {
        id: r.id,
        question: r.question,
        answer: r.answer,
        userId: r.userId,
        hasUserObject: !!r.user,
        userData: r.user ? {
          id: r.user.id,
          name: `${r.user.firstName} ${r.user.lastName}`,
          email: r.user.email
        } : 'No user data'
      });
    });

    // Calculate correct metadata - count unique users instead of just responses
    const uniqueUserIds = [...new Set(responses.map(r => r.userId))];
    const totalUsers = uniqueUserIds.length;
    const totalResponses = responses.length;
    
    console.log(`📊 [CONTROLLER] Metadata calculation:`, {
      totalResponses: totalResponses,
      totalUsers: totalUsers,
      uniqueUserIds: uniqueUserIds,
      responsesPerUser: totalUsers > 0 ? (totalResponses / totalUsers).toFixed(1) : 0
    });

    // Format responses for client consumption
    console.log('🔄 [CONTROLLER] Formatting responses for response...');
    const formatted = responses.map(r => {
      // Log each response being processed for debugging
      console.log(`📝 [CONTROLLER] Processing response ${r.id}:`, {
        originalQuestion: r.question,
        answerType: typeof r.answer,
        answerValue: r.answer
      });
      
      return {
        id: r.id,
        question: r.question, // This should now be populated after fixes
        answer: r.answer,
        user: r.user ? {
          id: r.user.id,
          name: `${r.user.firstName} ${r.user.lastName}`,
          email: r.user.email,
          city: r.user.city,
          area: r.user.residentialArea,
          gender: r.user.gender,
          age: r.user.age
        } : null
      };
    });

    // Final verification of formatted data
    console.log('🔍 [CONTROLLER] Final formatted data verification:');
    formatted.slice(0, 3).forEach((f, index) => {
      console.log(`   Formatted ${index + 1}:`, {
        id: f.id,
        question: f.question,
        hasUser: !!f.user
      });
    });

    console.log(`🎉 [CONTROLLER] Successfully formatted ${formatted.length} responses`);
    
    // Return successful response with formatted data and CORRECTED METADATA
    res.status(200).json({
      message: 'Responses with user details fetched successfully!',
      responses: formatted,
      metadata: {
        totalResponses: totalResponses, // Total number of individual responses
        totalUsers: totalUsers, // Total number of unique users who responded
        responsesPerUser: totalUsers > 0 ? (totalResponses / totalUsers).toFixed(1) : 0, // Average responses per user
        surveyId: surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role,
        hasAdminPrivileges: req.client?.role === 'client_admin'
      }
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error in getSurveyResponsesWithUserDetails:', error);
    console.error('🔍 [CONTROLLER] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({ 
      message: error.message,
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role,
        errorName: error.name
      } : undefined
    });
  }
};

// Get detailed analytics with demographic segmentation - AGORA COM PRIVILÉGIOS
export const getSurveyAnalytics = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const clientId = req.client?.id;
    const clientRole = req.client?.role;
    
    console.log(`📊 [ANALYTICS] Getting analytics for survey ${surveyId}, client ${clientId}, role ${clientRole}`);
    
    if (!clientId) {
      console.error('❌ [ANALYTICS] Client ID missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verificar acesso com privilégios
    console.log(`🔍 [ANALYTICS] Verifying survey access with privileges...`);
    let survey;
    
    if (clientRole === 'client_admin') {
      // Admin pode acessar qualquer survey
      survey = await Survey.findByPk(surveyId);
    } else {
      // Cliente normal só acessa seus próprios surveys
      survey = await Survey.findOne({ 
        where: { id: surveyId, clientId }
      });
    }
    
    if (!survey) {
      console.error(`❌ [ANALYTICS] Survey ${surveyId} not found or access denied`);
      return res.status(404).json({ message: 'Survey not found or access denied' });
    }

    console.log(`✅ [ANALYTICS] Survey found: "${survey.title}" (ID: ${survey.id})`);
    console.log(`📋 [ANALYTICS] Survey details:`, {
      clientId: survey.clientId,
      questionsCount: survey.questions?.length || 0,
      status: survey.status,
      expirationTime: survey.expirationTime,
      accessedByAdmin: clientRole === 'client_admin'
    });
    
    // Process analytics using the analytics service
    console.log(`🔄 [ANALYTICS] Processing analytics data...`);
    const analyticsData = await processSurveyAnalytics(survey);
    
    // Adicionar informação sobre quem está acessando
    analyticsData.accessInfo = {
      accessedByClientId: clientId,
      accessedByRole: clientRole,
      isAdminAccess: clientRole === 'client_admin',
      surveyOwnerClientId: survey.clientId
    };
    
    console.log(`🎉 [ANALYTICS] Analytics processed successfully for survey ${surveyId}`);
    console.log(`📈 [ANALYTICS] Analytics summary:`, {
      totalRespondents: analyticsData.summary?.totalRespondents,
      demographicSummary: analyticsData.summary?.demographicSummary,
      accessedByAdmin: clientRole === 'client_admin'
    });
    
    res.status(200).json(analyticsData);

  } catch (error) {
    console.error('❌ [ANALYTICS] Analytics processing error:', error);
    console.error('🔍 [ANALYTICS] Error details:', {
      name: error.name,
      message: error.message,
      surveyId: req.params.surveyId,
      clientId: req.client?.id,
      clientRole: req.client?.role
    });
    
    res.status(500).json({ 
      message: 'Failed to fetch survey analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        surveyId: req.params.surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role
      } : undefined
    });
  }
};

// Get survey results with user scores - AGORA COM VERIFICAÇÃO DE PRIVILÉGIOS
export const getSurveyResultsWithScores = async (req, res) => {
  const { surveyId } = req.params;
  
  try {
    console.log(`🎯 [SCORES] Starting getSurveyResultsWithScores for survey: ${surveyId}`);
    console.log(`👤 [SCORES] Client making request:`, req.client?.id, 'Role:', req.client?.role);
    
    // USAR A NOVA FUNÇÃO COM PRIVILÉGIOS
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    
    console.log(`✅ [SCORES] Access verified, fetching responses with scores...`);
    
    // Get responses with user details from service layer
    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    
    if (!responses || responses.length === 0) {
      console.log(`❌ [SCORES] No responses found for survey: ${surveyId}`);
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    console.log(`✅ [SCORES] Retrieved ${responses.length} responses with scores`);

    // Format responses including user scores
    console.log('🔄 [SCORES] Formatting responses with scores...');
    const formatted = responses.map(r => {
      return {
        id: r.id,
        question: r.question,
        answer: r.answer,
        user: r.user ? {
          id: r.user.id,
          name: `${r.user.firstName} ${r.user.lastName}`,
          email: r.user.email,
          score: r.user.score || 0,  // 👈 INCLUDES USER SCORE
          city: r.user.city,
          area: r.user.residentialArea,
          gender: r.user.gender,
          age: r.user.age
        } : null
      };
    });

    // Calculate statistics with scores
    const uniqueUserIds = [...new Set(responses.map(r => r.userId))];
    const totalUsers = uniqueUserIds.length;
    const totalResponses = responses.length;
    
    // Calculate average score
    const usersWithScores = responses
      .filter(r => r.user && r.user.score !== undefined)
      .map(r => r.user);
    
    const uniqueUsers = [...new Map(usersWithScores.map(u => [u.id, u])).values()];
    const averageScore = uniqueUsers.length > 0 
      ? uniqueUsers.reduce((sum, u) => sum + (u.score || 0), 0) / uniqueUsers.length 
      : 0;

    console.log(`📊 [SCORES] Score statistics:`, {
      totalUsers: totalUsers,
      totalResponses: totalResponses,
      averageScore: averageScore.toFixed(2),
      usersWithScores: uniqueUsers.length,
      clientRole: req.client?.role
    });

    console.log(`🎉 [SCORES] Successfully formatted ${formatted.length} responses with scores`);
    
    // Return successful response with scores data
    res.status(200).json({
      message: 'Responses with user scores fetched successfully!',
      responses: formatted,
      statistics: {
        totalResponses: totalResponses,
        totalUsers: totalUsers,
        averageScore: parseFloat(averageScore.toFixed(2)),
        usersWithScores: uniqueUsers.length
      },
      metadata: {
        surveyId: surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role,
        hasAdminPrivileges: req.client?.role === 'client_admin'
      }
    });
  } catch (error) {
    console.error('❌ [SCORES] Error in getSurveyResultsWithScores:', error);
    console.error('🔍 [SCORES] Error details:', {
      name: error.name,
      message: error.message,
      surveyId: surveyId,
      clientId: req.client?.id,
      clientRole: req.client?.role
    });
    
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({ 
      message: error.message,
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role,
        errorName: error.name
      } : undefined
    });
  }
};

// Award points to user who responded to survey - AGORA COM VERIFICAÇÃO DE PRIVILÉGIOS
export const awardPointsToUser = async (req, res) => {
  try {
    const { surveyId, userId } = req.params;
    const { points } = req.body;
    
    console.log(`🎯 [AWARD] Starting awardPointsToUser for survey: ${surveyId}, user: ${userId}`);
    console.log(`👤 [AWARD] Client:`, req.client?.id, 'Role:', req.client?.role, 'Points:', points);
    
    // Basic validation
    if (!points || typeof points !== 'number') {
      console.log(`❌ [AWARD] Invalid points value:`, points);
      return res.status(400).json({ 
        message: 'Points must be a valid number' 
      });
    }
    
    // USAR A NOVA FUNÇÃO COM PRIVILÉGIOS
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    
    console.log(`✅ [AWARD] Survey access verified`);

    // Check if user responded to this survey
    const userResponse = await Result.findOne({
      where: { surveyId, userId }
    });
    
    if (!userResponse) {
      console.log(`❌ [AWARD] User ${userId} did not respond to survey ${surveyId}`);
      return res.status(404).json({ 
        message: 'User did not respond to this survey' 
      });
    }

    console.log(`✅ [AWARD] User response verified`);

    // Get user to update score
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`❌ [AWARD] User ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user score
    const currentScore = user.score || 0;
    const newScore = currentScore + points;
    
    console.log(`📊 [AWARD] Updating score for user ${userId}: ${currentScore} + ${points} = ${newScore}`);
    
    await user.update({ score: newScore });
    
    console.log(`✅ [AWARD] Score updated successfully`);

    // Return success response
    res.status(200).json({
      success: true,
      message: `Points awarded successfully!`,
      pointsAwarded: points,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        previousScore: currentScore,
        newScore: newScore,
        totalChange: points
      },
      survey: {
        id: surveyId,
        responseId: userResponse.id
      },
      awardedBy: {
        clientId: req.client?.id,
        companyName: req.client?.companyName,
        role: req.client?.role,
        isAdmin: req.client?.role === 'client_admin',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`🎉 [AWARD] Points awarded successfully to user ${userId}`);

  } catch (error) {
    console.error('❌ [AWARD] Error awarding points:', error);
    console.error('🔍 [AWARD] Error details:', {
      name: error.name,
      message: error.message,
      surveyId: req.params.surveyId,
      userId: req.params.userId,
      clientId: req.client?.id,
      clientRole: req.client?.role
    });
    
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({ 
      success: false,
      message: 'Error awarding points',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        surveyId: req.params.surveyId,
        userId: req.params.userId,
        clientRole: req.client?.role
      } : undefined
    });
  }
};

// Export all controller functions
export default {
  // Funções originais
  getResponsesBySurvey,
  getResponsesByQuestion,
  getSurveyResponsesWithUserDetails,
  getSurveyAnalytics,
  getSurveyResultsWithScores,  
  awardPointsToUser,
  getAllSurveys,
  getAdminDashboard
};