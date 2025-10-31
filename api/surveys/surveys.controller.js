import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Import dos controllers divididos - ATUALIZADO COM NOVO CONTROLLER
import { createSurvey, getActiveSurveys } from './surveys.creation.controller.js';
import { respondToSurveyByToken, validateSurveyResponses } from './surveys.response.validation.controller.js';
import { deleteSurvey, getSurveyByAccessToken } from './surveys.management.controller.js';
import { getClientSurveys } from './surveys.client.controller.js';
import { getMySurveys, getClientSurveyStats } from './surveys.client.detailed.controller.js';
import { debugMySurveys, debugSurveyDetails, healthCheckClientSurveys } from './surveys.client.debug.controller.js';

// Re-export todos os controllers - ATUALIZADO
export {
  createSurvey,
  getActiveSurveys,
  respondToSurveyByToken,
  validateSurveyResponses,
  deleteSurvey,
  getSurveyByAccessToken,
  getClientSurveys,
  getMySurveys,
  getClientSurveyStats,
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys
};

// Funções adicionais que podem ser necessárias para compatibilidade
// Get all active surveys (public endpoint) - Mantido para compatibilidade
export const getActiveSurveysLegacy = async (req, res) => {
  try {
    console.log('🔍 Fetching Active Surveys...');
    const surveys = await surveysService.getActiveSurveys();
    console.log(`✅ Found ${surveys.length} Active Surveys`);
    res.status(200).json({ surveys });
  } catch (error) {
    console.error('❌ Get Active Surveys Error:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Submit responses to a survey using access token - Mantido para compatibilidade
export const respondToSurveyByTokenLegacy = async (req, res) => {
  try {
    console.log('📝 Survey Response Submission Started');
    const { accessToken } = req.query;
    
    // Validate that access token is provided
    if (!accessToken) {
      console.error('❌ Access Token Missing');
      return res.status(400).json({ message: 'Token required' });
    }

    console.log(`🔍 Looking for Survey with Token: ${accessToken}`);
    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey Not Found for Token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey Found: ${survey.title} (ID: ${survey.id})`);
    console.log(`👤 User ID: ${req.user?.userId || 'Anonymous'}`);
    console.log(`📋 Response Count: ${Array.isArray(req.body) ? req.body.length : 'Invalid'}`);
    
    // Save the survey responses
    await surveysService.saveResponse(survey.id, req.user?.userId, req.body);
    
    console.log('✅ Responses Saved Successfully');
    res.status(200).json({ message: 'Responses saved' });
  } catch (error) {
    console.error('❌ Submit Response Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a survey (admin only) - Mantido para compatibilidade
export const deleteSurveyLegacy = async (req, res) => {
  try {
    const surveyId = req.params.id;
    console.log(`🗑️ Deleting Survey ID: ${surveyId}`);
    
    await surveysService.deleteSurvey(surveyId);
    
    console.log(`✅ Survey ${surveyId} Deleted Successfully`);
    res.status(200).json({ message: 'Survey deleted' });
  } catch (error) {
    console.error('❌ Delete Survey Error:', error);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey details by access token (public endpoint) - Mantido para compatibilidade
export const getSurveyByAccessTokenLegacy = async (req, res) => {
  try {
    const { accessToken } = req.query;
    console.log(`🔍 Fetching Survey by Token: ${accessToken}`);
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Token required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey Not Found for Token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey Found: ${survey.title}`);
    res.status(200).json(survey);
  } catch (error) {
    console.error('❌ Get Survey Error:', error);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};

// Get client's surveys with response counts - Mantido para compatibilidade
export const getClientSurveysLegacy = async (req, res) => {
  try {
    const clientId = req.client?.id;
    console.log(`🔍 [GET_CLIENT_SURVEYS] Fetching Surveys for Client ID: ${clientId}`);
    
    if (!clientId) {
      console.error('❌ [GET_CLIENT_SURVEYS] Client ID Missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`🔍 [GET_CLIENT_SURVEYS] Querying Database for Client ${clientId}...`);
    const surveys = await Survey.findAll({ 
      where: { clientId }
    });
    
    console.log(`📊 [GET_CLIENT_SURVEYS] Found ${surveys.length} Surveys for Client ${clientId}`);
    
    // Add response count statistics to each survey
    const surveysWithStats = await Promise.all(
      surveys.map(async survey => {
        const responseCount = await Result.count({ where: { surveyId: survey.id } });
        console.log(`   📈 [GET_CLIENT_SURVEYS] Survey ${survey.id}: ${responseCount} Responses`);
        return {
          ...survey.toJSON(),
          responseCount
        };
      })
    );
    
    console.log(`✅ [GET_CLIENT_SURVEYS] Returning ${surveysWithStats.length} Surveys with Statistics`);
    res.status(200).json({ surveys: surveysWithStats });
  } catch (error) {
    console.error('❌ [GET_CLIENT_SURVEYS] Get Client Surveys Error:', error);
    console.error('❌ [GET_CLIENT_SURVEYS] Error Stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export default para compatibilidade - ATUALIZADO
export default {
  // From creation
  createSurvey,
  getActiveSurveys,
  
  // From response validation
  respondToSurveyByToken,
  validateSurveyResponses,
  
  // From client
  getClientSurveys,
  
  // From client detailed (NOVO)
  getMySurveys,
  getClientSurveyStats,
  
  // From debug
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys,
  
  // From management
  deleteSurvey,
  getSurveyByAccessToken,
  
  // Legacy functions for compatibility
  getActiveSurveysLegacy,
  respondToSurveyByTokenLegacy,
  deleteSurveyLegacy,
  getSurveyByAccessTokenLegacy,
  getClientSurveysLegacy
};
