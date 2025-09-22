import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Function to generate a unique token for a survey
export const generateSurveyToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Function to create a new survey
export const createSurvey = async (surveyData, clientId = null) => {
  try {
    console.log('=== SURVEY SERVICE STARTED ===');
    console.log('📥 Survey data received in service:', JSON.stringify({
      title: surveyData.title,
      description: surveyData.description?.substring(0, 100) + '...',
      questionsCount: surveyData.questions?.length,
      expirationTime: surveyData.expirationTime,
      responseLimit: surveyData.responseLimit,
      clientId: surveyData.clientId
    }, null, 2));

    // Validate required fields
    if (!surveyData.title) {
      throw new Error('Survey title is required');
    }
    if (!surveyData.questions || !Array.isArray(surveyData.questions)) {
      throw new Error('Questions array is required');
    }
    if (!surveyData.expirationTime) {
      throw new Error('Expiration time is required');
    }

    console.log('✅ Basic validation passed');

    // Generate a unique token for survey access
    surveyData.accessToken = generateSurveyToken();
    console.log('🔐 Generated access token:', surveyData.accessToken);
    
    // If clientId is provided, associate survey with the client
    if (clientId) {
      surveyData.clientId = clientId;
      console.log(`🔗 Client ID assigned: ${clientId}`);
    }

    // Validate response limit if provided
    if (surveyData.responseLimit && 
        (surveyData.responseLimit < 1 || surveyData.responseLimit > 1000)) {
      throw new Error('Response limit must be between 1 and 1000');
    }

    console.log('🔄 Validating questions structure...');
    
    // Validate each question structure
    surveyData.questions.forEach((question, index) => {
      console.log(`\n🔍 Validating question ${index + 1}:`);
      console.log(`   Type: ${question.type}`);
      console.log(`   Question text: ${question.question}`);
      console.log(`   Question ID: ${question.questionId}`);
      console.log(`   Multiple selections: ${question.multipleSelections}`);
      console.log(`   Answer length: ${question.answerLength}`);
      console.log(`   Options count: ${question.options?.length || 0}`);
      
      if (!question.type) {
        throw new Error(`Question ${index + 1} missing type`);
      }
      if (!question.question) {
        throw new Error(`Question ${index + 1} missing question text`);
      }
      if (!question.questionId) {
        throw new Error(`Question ${index + 1} missing questionId`);
      }
      
      // Validate multiple choice questions
      if (question.type === 'multiple') {
        if (!question.options || !Array.isArray(question.options)) {
          throw new Error(`Question ${index + 1} (multiple choice) missing options array`);
        }
        if (question.options.length === 0) {
          throw new Error(`Question ${index + 1} (multiple choice) must have at least one option`);
        }
        
        // Validate multipleSelections format
        if (question.multipleSelections && !['yes', 'no'].includes(question.multipleSelections)) {
          throw new Error(`Question ${index + 1}: multipleSelections must be "yes" or "no"`);
        }
        
        // Set default if not provided
        if (!question.multipleSelections) {
          question.multipleSelections = 'no';
          console.log(`   ➕ Set default multipleSelections: "no"`);
        }
      }
    });

    console.log('✅ All questions validated successfully');
    console.log('🔄 Creating survey in database...');

    // Log final data before creation
    console.log('📤 Final survey data being sent to database:', {
      title: surveyData.title,
      questionsCount: surveyData.questions.length,
      firstQuestion: surveyData.questions[0] ? {
        type: surveyData.questions[0].type,
        question: surveyData.questions[0].question,
        multipleSelections: surveyData.questions[0].multipleSelections
      } : 'No questions'
    });

    // Create the survey in database
    const survey = await Survey.create(surveyData);
    
    console.log('🎉 Survey created successfully!');
    console.log('📊 Survey details:', {
      id: survey.id,
      title: survey.title,
      questionsCount: Array.isArray(survey.questions) ? survey.questions.length : 'N/A',
      accessToken: survey.accessToken,
      clientId: survey.clientId
    });
    
    return survey;
  } catch (error) {
    console.error('❌ Survey creation error in service:', error);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // Primeiras 3 linhas do stack
    });
    
    // Log específico para erros de validação do Sequelize
    if (error.name === 'SequelizeValidationError') {
      console.error('🔍 Sequelize validation errors:');
      error.errors.forEach((err, index) => {
        console.error(`   ${index + 1}. Path: ${err.path}, Message: ${err.message}`);
        if (err.value) {
          console.error(`      Value: ${JSON.stringify(err.value).substring(0, 200)}...`);
        }
      });
    }
    
    // Log específico para erros de banco de dados
    if (error.name === 'SequelizeDatabaseError') {
      console.error('💾 Database error:', error.message);
    }
    
    throw new Error('Error creating survey: ' + error.message);
  }
};

// Function to get active surveys (optionally filtered by client)
export const getActiveSurveys = async (clientId = null) => {
  try {
    console.log('🔄 Fetching active surveys...');
    
    // Prepare base query conditions
    const whereConditions = {
      status: 'active',
      expirationTime: { [Op.gt]: new Date() }
    };

    // Add client filter if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
      console.log(`🔍 Filtering by client ID: ${clientId}`);
    }

    console.log('📋 Query conditions:', whereConditions);

    // Execute query
    const surveys = await Survey.findAll({ where: whereConditions });
    
    console.log(`✅ Found ${surveys.length} active surveys`);
    
    return surveys;
  } catch (error) {
    console.error('❌ Error fetching active surveys:', error);
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Function to get a survey by access token (with optional client verification)
export const getSurveyByAccessToken = async (accessToken, clientId = null) => {
  try {
    console.log('🔄 Fetching survey by access token...');
    console.log('🔑 Access token:', accessToken);
    
    // Prepare query conditions
    const whereConditions = { accessToken };
    
    // Add client verification if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
      console.log(`🔍 Verifying ownership for client ID: ${clientId}`);
    }

    console.log('📋 Query conditions:', whereConditions);

    // Find the survey
    const survey = await Survey.findOne({ where: whereConditions });

    if (!survey) {
      console.log('❌ Survey not found or access denied');
      return null;
    }

    console.log('✅ Survey found:', {
      id: survey.id,
      title: survey.title,
      questionsCount: survey.questions?.length || 0
    });

    return survey;
  } catch (error) {
    console.error('❌ Error fetching survey by token:', error);
    throw new Error('Error fetching survey by access token: ' + error.message);
  }
};

// Function to save user responses to a survey
export const saveResponse = async (surveyId, userId, response) => {
  try {
    console.log('🔄 Saving survey responses...');
    console.log('📋 Response details:', {
      surveyId,
      userId,
      responseCount: response?.length || 0
    });

    // Verify survey exists
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    console.log('✅ Survey verified:', survey.title);

    // Check for duplicate responses
    const existingResponse = await Result.findOne({
      where: { surveyId, userId }
    });

    if (existingResponse) {
      console.log('❌ User has already responded to this survey');
      throw new Error('User has already responded to this survey');
    }

    // Validate response format
    if (!Array.isArray(response) || response.some(item => !item.questionId || !item.answer)) {
      console.log('❌ Invalid response format');
      throw new Error('Invalid response format: questionId and answer required');
    }

    console.log('✅ Response format validated');

    // Prepare response records
    const resultEntries = response.map(item => ({
      surveyId,
      userId,
      question: item.question,
      answer: item.answer
    }));

    console.log('📤 Prepared response entries:', resultEntries.length);

    // Save all responses
    const results = await Result.bulkCreate(resultEntries);
    console.log(`✅ Saved ${results.length} responses for survey ${surveyId}`);
    
    return results;
  } catch (error) {
    console.error('❌ Error saving responses:', error);
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to delete a survey (with client verification)
export const deleteSurvey = async (surveyId, clientId = null) => {
  try {
    console.log('🔄 Deleting survey...');
    console.log('📋 Delete details:', { surveyId, clientId });

    // Find the survey
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      console.log('❌ Survey not found');
      throw new Error('Survey not found');
    }

    console.log('✅ Survey found:', survey.title);

    // Verify client ownership if clientId is provided
    if (clientId && survey.clientId !== clientId) {
      console.log('❌ Client does not own this survey');
      throw new Error('You do not have permission to delete this survey');
    }

    // Delete the survey
    await survey.destroy();
    console.log(`✅ Survey ${surveyId} deleted successfully`);
    
  } catch (error) {
    console.error('❌ Error deleting survey:', error);
    throw new Error('Error deleting survey: ' + error.message);
  }
};

// Function to get survey with detailed questions
export const getSurveyWithDetails = async (surveyId) => {
  try {
    console.log('🔄 Fetching survey with details...');
    
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      console.log('❌ Survey not found');
      return null;
    }

    console.log('✅ Survey details fetched:', {
      id: survey.id,
      title: survey.title,
      questionsCount: survey.questions?.length || 0
    });

    return survey;
  } catch (error) {
    console.error('❌ Error fetching survey details:', error);
    throw new Error('Error fetching survey details: ' + error.message);
  }
};

// Export all service functions
const surveysService = {
  createSurvey,
  getActiveSurveys,
  getSurveyByAccessToken,
  saveResponse,
  deleteSurvey,
  generateSurveyToken,
  getSurveyWithDetails
};

export default surveysService;
