import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Function to generate a unique token for a survey
export const generateSurveyToken = () => {
  // Generate 20 random bytes and convert to a hexadecimal string
  return crypto.randomBytes(20).toString('hex');
};

// Function to create a new survey
export const createSurvey = async (surveyData, clientId = null) => {
  try {
    // Generate a unique token for survey access
    surveyData.accessToken = generateSurveyToken();
    
    // If clientId is provided, associate survey with the client
    if (clientId) {
      surveyData.clientId = clientId;
      console.log(`Creating survey for client ID: ${clientId}`);
    }

    // Validate response limit if provided (must be between 1 and 1000)
    if (surveyData.responseLimit && 
        (surveyData.responseLimit < 1 || surveyData.responseLimit > 1000)) {
      throw new Error('Response limit must be between 1 and 1000');
    }

    // Create the survey in database with all provided data
    const survey = await Survey.create(surveyData);
    
    // Log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Survey created successfully:', survey.id);
    }
    
    return survey;
  } catch (error) {
    console.error('Survey creation error:', error);
    throw new Error('Error creating survey: ' + error.message);
  }
};

// Function to get active surveys (optionally filtered by client)
export const getActiveSurveys = async (clientId = null) => {
  try {
    // Prepare base query conditions
    const whereConditions = {
      status: 'active',
      expirationTime: { [Op.gt]: new Date() }
    };

    // Add client filter if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
      console.log(`Fetching active surveys for client ID: ${clientId}`);
    }

    // Execute query
    const surveys = await Survey.findAll({ where: whereConditions });
    
    return surveys;
  } catch (error) {
    console.error('Error fetching active surveys:', error);
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Function to get a survey by access token (with optional client verification)
export const getSurveyByAccessToken = async (accessToken, clientId = null) => {
  try {
    // Prepare query conditions
    const whereConditions = { accessToken };
    
    // Add client verification if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
      console.log(`Verifying survey ownership for client ID: ${clientId}`);
    }

    // Find the survey
    const survey = await Survey.findOne({ where: whereConditions });

    if (!survey) {
      console.log('Survey not found or access denied');
      return null;
    }

    return survey;
  } catch (error) {
    console.error('Error fetching survey by token:', error);
    throw new Error('Error fetching survey by access token: ' + error.message);
  }
};

// Function to save user responses to a survey
export const saveResponse = async (surveyId, userId, response) => {
  try {
    // Verify survey exists
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check for duplicate responses
    const existingResponse = await Result.findOne({
      where: { surveyId, userId }
    });

    if (existingResponse) {
      throw new Error('User has already responded to this survey');
    }

    // Validate response format
    if (!Array.isArray(response) || response.some(item => !item.questionId || !item.answer)) {
      throw new Error('Invalid response format: questionId and answer required');
    }

    // Prepare response records
    const resultEntries = response.map(item => ({
      surveyId,
      userId,
      question: item.question,
      answer: item.answer
    }));

    // Save all responses
    const results = await Result.bulkCreate(resultEntries);
    console.log(`Saved ${results.length} responses for survey ${surveyId}`);
    
    return results;
  } catch (error) {
    console.error('Error saving responses:', error);
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to delete a survey (with client verification)
export const deleteSurvey = async (surveyId, clientId = null) => {
  try {
    // Find the survey
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Verify client ownership if clientId is provided
    if (clientId && survey.clientId !== clientId) {
      throw new Error('You do not have permission to delete this survey');
    }

    // Delete the survey
    await survey.destroy();
    console.log(`Survey ${surveyId} deleted successfully`);
    
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw new Error('Error deleting survey: ' + error.message);
  }
};

// Export all service functions
const surveysService = {
  createSurvey,
  getActiveSurveys,
  getSurveyByAccessToken,
  saveResponse,
  deleteSurvey,
  generateSurveyToken
};

export default surveysService;
  