import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Import divided controllers
import { createSurvey, getActiveSurveys } from './surveys.creation.controller.js';
import { respondToSurveyByToken, validateSurveyResponses } from './surveys.response.validation.controller.js';
import { deleteSurvey, getSurveyByAccessToken } from './surveys.management.controller.js';
import { getClientSurveys } from './surveys.client.controller.js';
import { getMySurveys, getClientSurveyStats } from './surveys.client.detailed.controller.js';
import { debugMySurveys, debugSurveyDetails, healthCheckClientSurveys } from './surveys.client.debug.controller.js';
import { respondToSurveyPermissive } from './surveys.permissive.response.controller.js';

// Re-export all controllers
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
  healthCheckClientSurveys,
  respondToSurveyPermissive
};

// Get all active surveys (public endpoint) - Compatibility function
export const getActiveSurveysLegacy = async (req, res) => {
  try {
    console.log('[GET] Active Surveys');
    const surveys = await surveysService.getActiveSurveys();
    console.log(`[SUCCESS] Found ${surveys.length} active surveys`);
    res.status(200).json({ surveys });
  } catch (error) {
    console.error('[ERROR] Get Active Surveys:', error.message);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Submit responses to a survey using access token - Compatibility function
export const respondToSurveyByTokenLegacy = async (req, res) => {
  try {
    console.log('[POST] Survey Response Submission');
    const { accessToken } = req.query;
    
    if (!accessToken) {
      console.error('[ERROR] Access token missing');
      return res.status(400).json({ message: 'Access token is required' });
    }

    console.log(`[INFO] Survey token: ${accessToken}`);
    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error(`[ERROR] Survey not found for token: ${accessToken}`);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`[INFO] Survey found: "${survey.title}" (ID: ${survey.id})`);
    
    // Get user ID - support both user and client authentication
    const userId = req.user?.userId || req.user?.id || req.userId || req.user?.clientId || null;
    
    if (!userId) {
      console.error('[ERROR] Authentication required - no user ID found');
      return res.status(401).json({ 
        message: 'Authentication required. Please log in to respond to this survey.' 
      });
    }
    
    console.log(`[INFO] User authenticated: ${userId} (${req.user?.clientId ? 'client' : 'user'})`);
    console.log(`[INFO] Processing ${Array.isArray(req.body) ? req.body.length : 0} responses`);
    
    // Save the survey responses
    await surveysService.saveResponse(survey.id, userId, req.body);
    
    console.log(`[SUCCESS] Responses saved for survey ${survey.id}`);
    res.status(200).json({ 
      message: 'Responses saved successfully',
      surveyId: survey.id,
      userId: userId
    });
  } catch (error) {
    console.error('[ERROR] Submit Response:', error.message);
    
    // Return appropriate status code based on error type
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('Authentication') || error.message.includes('User ID')) {
      statusCode = 401;
      errorMessage = 'Authentication required to submit responses.';
    } else if (error.message.includes('already responded')) {
      statusCode = 400;
      errorMessage = 'You have already responded to this survey.';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Invalid') || error.message.includes('validation')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message
      })
    });
  }
};

// Delete a survey - Compatibility function
export const deleteSurveyLegacy = async (req, res) => {
  try {
    const surveyId = req.params.id;
    console.log(`[DELETE] Survey ID: ${surveyId}`);
    
    await surveysService.deleteSurvey(surveyId);
    
    console.log(`[SUCCESS] Survey ${surveyId} deleted`);
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('[ERROR] Delete Survey:', error.message);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey details by access token - Compatibility function
export const getSurveyByAccessTokenLegacy = async (req, res) => {
  try {
    const { accessToken } = req.query;
    console.log(`[GET] Survey by token: ${accessToken}`);
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error(`[ERROR] Survey not found for token: ${accessToken}`);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`[SUCCESS] Survey retrieved: "${survey.title}"`);
    res.status(200).json(survey);
  } catch (error) {
    console.error('[ERROR] Get Survey:', error.message);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};

// Get client's surveys with response counts - Compatibility function
export const getClientSurveysLegacy = async (req, res) => {
  try {
    const clientId = req.client?.id;
    console.log(`[GET] Client surveys for ID: ${clientId}`);
    
    if (!clientId) {
      console.error('[ERROR] Client ID missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    const surveys = await Survey.findAll({ 
      where: { clientId }
    });
    
    console.log(`[INFO] Found ${surveys.length} surveys for client ${clientId}`);
    
    // Add response count for each survey
    const surveysWithStats = await Promise.all(
      surveys.map(async survey => {
        const responseCount = await Result.count({ where: { surveyId: survey.id } });
        return {
          ...survey.toJSON(),
          responseCount
        };
      })
    );
    
    console.log(`[SUCCESS] Returning ${surveysWithStats.length} surveys with statistics`);
    res.status(200).json({ surveys: surveysWithStats });
  } catch (error) {
    console.error('[ERROR] Get Client Surveys:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Default export for compatibility
export default {
  createSurvey,
  getActiveSurveys,
  respondToSurveyByToken,
  validateSurveyResponses,
  getClientSurveys,
  getMySurveys,
  getClientSurveyStats,
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys,
  deleteSurvey,
  getSurveyByAccessToken,
  respondToSurveyPermissive,
  getActiveSurveysLegacy,
  respondToSurveyByTokenLegacy,
  deleteSurveyLegacy,
  getSurveyByAccessTokenLegacy,
  getClientSurveysLegacy
};
