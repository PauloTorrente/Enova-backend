import * as surveysService from './surveys.service.js';
import crypto from 'crypto';

// Helper function to generate survey token
const generateSurveyToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Create a new survey (accessible to both admin and clients)
export const createSurvey = async (req, res) => {
  try {
    console.log('🚀 Survey Creation - Started');
    
    const surveyData = req.body;
    
    // Log basic request info
    console.log(`📝 Request from: ${req.client?.id ? `Client ${req.client.id}` : req.user?.role || 'Anonymous'}`);
    
    // Auto-assign client ID if request comes from authenticated client
    if (req.client?.id) {
      surveyData.clientId = req.client.id;
      console.log(`🔗 Auto-assigned Client ID: ${req.client.id}`);
    }
    // Admin users can optionally specify clientId in request body
    else if (req.user?.role !== 'admin') {
      console.log('🚫 Access Denied - Not admin and no client ID provided');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate required fields
    if (!surveyData.title || !surveyData.questions || !Array.isArray(surveyData.questions)) {
      console.log('❌ Validation Failed: Missing required fields');
      return res.status(400).json({ 
        message: 'Title and questions array are required' 
      });
    }

    console.log(`📋 Survey Info: "${surveyData.title}" with ${surveyData.questions.length} questions`);
    
    // CRITICAL: Generate access token e passa para o service
    const accessToken = generateSurveyToken();
    console.log(`🔐 Generated Access Token: ${accessToken}`);
    
    // Passa o token para o service
    surveyData.accessToken = accessToken;
    
    // Create survey using service
    const survey = await surveysService.createSurvey(surveyData);
    
    console.log(`✅ Survey Created: ID ${survey.id} - "${survey.title}"`);
    
    // CRITICAL FIX: Create response with all properties INCLUDING accessToken
    const surveyResponse = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
      accessToken: accessToken, // ← SEMPRE usa o token gerado no controller
      expirationTime: survey.expirationTime,
      status: survey.status,
      responseLimit: survey.responseLimit,
      clientId: survey.clientId,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt
    };
    
    console.log(`🔐 Access Token in response: ${surveyResponse.accessToken}`);
    console.log(`📤 Response includes accessToken: ${!!surveyResponse.accessToken}`);
    
    // Return successful response with created survey data INCLUDING accessToken
    res.status(201).json(surveyResponse);
  } catch (error) {
    console.error(`❌ Survey Creation Error: ${error.message}`);
    
    // Special handling for validation errors
    if (error.name === 'SequelizeValidationError') {
      console.error(`📋 Validation Errors: ${error.errors.length} issues found`);
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    // Return error response
    const statusCode = error.message.includes('validation') ? 400 : 500;
    res.status(statusCode).json({ 
      message: 'Failed to create survey',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all active surveys (public endpoint)
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('🔍 Fetching Active Surveys');
    const surveys = await surveysService.getActiveSurveys();
    console.log(`✅ Found ${surveys.length} Active Surveys`);
    res.status(200).json({ surveys });
  } catch (error) {
    console.error(`❌ Get Active Surveys Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Export creation controller functions
export default {
  createSurvey,
  getActiveSurveys
};
