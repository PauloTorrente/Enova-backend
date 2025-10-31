import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Function to generate a unique token for a survey
export const generateSurveyToken = () => {
  console.log('🔐 [GENERATE_TOKEN] Generating unique survey token...');
  const token = crypto.randomBytes(20).toString('hex');
  console.log('🔐 [GENERATE_TOKEN] Token generated:', token ? 'SUCCESS' : 'FAILED');
  return token;
};

// Function to create a new survey
export const createSurvey = async (surveyData, clientId = null) => {
  try {
    console.log('🚀 [CREATE_SURVEY] === SURVEY CREATION SERVICE STARTED ===');
    console.log('📥 [CREATE_SURVEY] Survey data received:', {
      title: surveyData.title,
      description: surveyData.description?.substring(0, 100) + '...',
      questionsCount: surveyData.questions?.length,
      expirationTime: surveyData.expirationTime,
      responseLimit: surveyData.responseLimit,
      clientId: surveyData.clientId,
      incomingClientId: clientId
    });

    // Validate required fields
    console.log('🔍 [CREATE_SURVEY] Validating required fields...');
    if (!surveyData.title) {
      console.error('❌ [CREATE_SURVEY] Validation failed: Survey title is required');
      throw new Error('Survey title is required');
    }
    if (!surveyData.questions || !Array.isArray(surveyData.questions)) {
      console.error('❌ [CREATE_SURVEY] Validation failed: Questions array is required');
      throw new Error('Questions array is required');
    }
    if (!surveyData.expirationTime) {
      console.error('❌ [CREATE_SURVEY] Validation failed: Expiration time is required');
      throw new Error('Expiration time is required');
    }
    console.log('✅ [CREATE_SURVEY] Basic validation passed');

    // Generate a unique token for survey access
    surveyData.accessToken = generateSurveyToken();
    console.log('🔐 [CREATE_SURVEY] Access token assigned:', surveyData.accessToken);
    
    // If clientId is provided, associate survey with the client
    if (clientId) {
      surveyData.clientId = clientId;
      console.log(`🔗 [CREATE_SURVEY] Client ID assigned: ${clientId}`);
    } else if (surveyData.clientId) {
      console.log(`🔗 [CREATE_SURVEY] Using provided client ID: ${surveyData.clientId}`);
    } else {
      console.log('⚠️ [CREATE_SURVEY] No client ID provided - survey will be admin-only');
    }

    // Validate response limit if provided
    if (surveyData.responseLimit) {
      console.log('🔍 [CREATE_SURVEY] Validating response limit:', surveyData.responseLimit);
      if (surveyData.responseLimit < 1 || surveyData.responseLimit > 1000) {
        console.error('❌ [CREATE_SURVEY] Response limit validation failed');
        throw new Error('Response limit must be between 1 and 1000');
      }
      console.log('✅ [CREATE_SURVEY] Response limit validation passed');
    }

    console.log('🔄 [CREATE_SURVEY] Validating questions structure...');
    
    // Validate each question structure
    surveyData.questions.forEach((question, index) => {
      console.log(`\n📋 [CREATE_SURVEY] Validating question ${index + 1}:`);
      console.log(`   Type: ${question.type}`);
      console.log(`   Question text: ${question.question}`);
      console.log(`   Question ID: ${question.questionId}`);
      console.log(`   Multiple selections: ${question.multipleSelections}`);
      console.log(`   Selection limit: ${question.selectionLimit}`);
      console.log(`   Answer length: ${question.answerLength}`);
      console.log(`   Options count: ${question.options?.length || 0}`);
      
      if (!question.type) {
        console.error(`❌ [CREATE_SURVEY] Question ${index + 1} missing type`);
        throw new Error(`Question ${index + 1} missing type`);
      }
      if (!question.question) {
        console.error(`❌ [CREATE_SURVEY] Question ${index + 1} missing question text`);
        throw new Error(`Question ${index + 1} missing question text`);
      }
      if (!question.questionId) {
        console.error(`❌ [CREATE_SURVEY] Question ${index + 1} missing questionId`);
        throw new Error(`Question ${index + 1} missing questionId`);
      }
      
      // Validate multiple choice questions
      if (question.type === 'multiple') {
        console.log(`   🔍 [CREATE_SURVEY] Validating multiple choice question...`);
        if (!question.options || !Array.isArray(question.options)) {
          console.error(`❌ [CREATE_SURVEY] Question ${index + 1} missing options array`);
          throw new Error(`Question ${index + 1} (multiple choice) missing options array`);
        }
        if (question.options.length === 0) {
          console.error(`❌ [CREATE_SURVEY] Question ${index + 1} has no options`);
          throw new Error(`Question ${index + 1} (multiple choice) must have at least one option`);
        }
        
        // Validate multipleSelections format
        if (question.multipleSelections && !['yes', 'no'].includes(question.multipleSelections)) {
          console.error(`❌ [CREATE_SURVEY] Invalid multipleSelections value: ${question.multipleSelections}`);
          throw new Error(`Question ${index + 1}: multipleSelections must be "yes" or "no"`);
        }
        
        // Set default if not provided
        if (!question.multipleSelections) {
          question.multipleSelections = 'no';
          console.log(`   ➕ [CREATE_SURVEY] Set default multipleSelections: "no"`);
        }
        
        // Validate selection limit for multiple selection questions
        if (question.multipleSelections === 'yes' && question.selectionLimit) {
          console.log(`   🔍 [CREATE_SURVEY] Validating selection limit: ${question.selectionLimit}`);
          if (typeof question.selectionLimit !== 'number' || question.selectionLimit < 1) {
            console.error(`❌ [CREATE_SURVEY] Invalid selectionLimit: ${question.selectionLimit}`);
            throw new Error(`Question ${index + 1}: selectionLimit must be a positive number`);
          }
          if (question.selectionLimit > question.options.length) {
            console.error(`❌ [CREATE_SURVEY] selectionLimit exceeds options count`);
            throw new Error(`Question ${index + 1}: selectionLimit cannot exceed the number of available options`);
          }
          if (question.selectionLimit === 1) {
            console.error(`❌ [CREATE_SURVEY] selectionLimit should not be 1 for multiple selection`);
            throw new Error(`Question ${index + 1}: For single selection, set multipleSelections to "no" instead of using selectionLimit`);
          }
          console.log(`   ✅ [CREATE_SURVEY] Selection limit validation passed`);
        }
        
        // Validate that selectionLimit is not used for single selection
        if (question.multipleSelections === 'no' && question.selectionLimit) {
          console.error(`❌ [CREATE_SURVEY] selectionLimit not allowed for single selection`);
          throw new Error(`Question ${index + 1}: selectionLimit is only allowed for multiple selection questions (multipleSelections: "yes")`);
        }
        
        console.log(`   ✅ [CREATE_SURVEY] Multiple choice validation passed`);
      }
    });

    console.log('✅ [CREATE_SURVEY] All questions validated successfully');
    console.log('🔄 [CREATE_SURVEY] Creating survey in database...');

    // Log final data before creation
    console.log('📤 [CREATE_SURVEY] Final survey data:', {
      title: surveyData.title,
      clientId: surveyData.clientId,
      questionsCount: surveyData.questions.length,
      expirationTime: surveyData.expirationTime,
      responseLimit: surveyData.responseLimit,
      hasAccessToken: !!surveyData.accessToken
    });

    // Create the survey in database
    console.log('💾 [CREATE_SURVEY] Executing Survey.create()...');
    const survey = await Survey.create(surveyData);
    
    console.log('🎉 [CREATE_SURVEY] Survey created successfully!');
    console.log('📊 [CREATE_SURVEY] Survey details:', {
      id: survey.id,
      title: survey.title,
      clientId: survey.clientId,
      questionsCount: Array.isArray(survey.questions) ? survey.questions.length : 'N/A',
      accessToken: survey.accessToken,
      status: survey.status
    });
    
    return survey;
  } catch (error) {
    console.error('❌ [CREATE_SURVEY] Survey creation error:', error);
    console.error('📋 [CREATE_SURVEY] Error details:', {
      name: error.name,
      message: error.message,
      constructor: error.constructor?.name
    });
    
    // Specific logging for Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      console.error('🔍 [CREATE_SURVEY] Sequelize validation errors:');
      error.errors.forEach((err, index) => {
        console.error(`   ${index + 1}. Path: ${err.path}, Message: ${err.message}`);
        console.error(`      Validator: ${err.validatorName}, Value: ${JSON.stringify(err.value)}`);
      });
    }
    
    // Specific logging for database errors
    if (error.name === 'SequelizeDatabaseError') {
      console.error('💾 [CREATE_SURVEY] Database error:', error.message);
      console.error('💾 [CREATE_SURVEY] SQL details:', error.parent?.sql);
    }
    
    // Specific logging for connection errors
    if (error.name === 'SequelizeConnectionError') {
      console.error('🔌 [CREATE_SURVEY] Database connection error:', error.message);
    }
    
    console.error('🔍 [CREATE_SURVEY] Stack trace (first 5 lines):');
    console.error(error.stack?.split('\n').slice(0, 5).join('\n'));
    
    throw new Error('Error creating survey: ' + error.message);
  }
};

// Function to get active surveys (optionally filtered by client)
export const getActiveSurveys = async (clientId = null) => {
  try {
    console.log('🔄 [GET_ACTIVE_SURVEYS] Fetching active surveys...');
    console.log('👤 [GET_ACTIVE_SURVEYS] Client ID parameter:', clientId);
    
    // Prepare base query conditions
    const whereConditions = {
      status: 'active',
      expirationTime: { [Op.gt]: new Date() }
    };

    // Add client filter if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
      console.log(`🔍 [GET_ACTIVE_SURVEYS] Filtering by client ID: ${clientId}`);
    } else {
      console.log('🔍 [GET_ACTIVE_SURVEYS] No client filter - fetching all active surveys');
    }

    console.log('📋 [GET_ACTIVE_SURVEYS] Query conditions:', JSON.stringify(whereConditions, null, 2));

    // Execute query
    console.log('💾 [GET_ACTIVE_SURVEYS] Executing database query...');
    const surveys = await Survey.findAll({ where: whereConditions });
    
    console.log(`✅ [GET_ACTIVE_SURVEYS] Found ${surveys.length} active surveys`);
    
    // Log survey details for debugging
    surveys.forEach((survey, index) => {
      console.log(`   📊 [GET_ACTIVE_SURVEYS] Survey ${index + 1}:`, {
        id: survey.id,
        title: survey.title,
        clientId: survey.clientId,
        status: survey.status,
        expirationTime: survey.expirationTime
      });
    });
    
    return surveys;
  } catch (error) {
    console.error('❌ [GET_ACTIVE_SURVEYS] Error fetching active surveys:', error);
    console.error('📋 [GET_ACTIVE_SURVEYS] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Function to get a survey by access token (with optional client verification)
export const getSurveyByAccessToken = async (accessToken, clientId = null) => {
  try {
    console.log('🔄 [GET_SURVEY_BY_TOKEN] Fetching survey by access token...');
    console.log('🔑 [GET_SURVEY_BY_TOKEN] Access token:', accessToken);
    console.log('👤 [GET_SURVEY_BY_TOKEN] Client ID for verification:', clientId);
    
    // Prepare query conditions
    const whereConditions = { accessToken };
    
    // Add client verification if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
      console.log(`🔍 [GET_SURVEY_BY_TOKEN] Verifying ownership for client ID: ${clientId}`);
    } else {
      console.log('🔍 [GET_SURVEY_BY_TOKEN] No client verification - public access');
    }

    console.log('📋 [GET_SURVEY_BY_TOKEN] Query conditions:', JSON.stringify(whereConditions, null, 2));

    // Find the survey
    console.log('💾 [GET_SURVEY_BY_TOKEN] Executing database query...');
    const survey = await Survey.findOne({ where: whereConditions });

    if (!survey) {
      console.log('❌ [GET_SURVEY_BY_TOKEN] Survey not found or access denied');
      console.log('🔍 [GET_SURVEY_BY_TOKEN] Possible reasons:');
      console.log('   - Invalid access token');
      console.log('   - Survey does not exist');
      console.log('   - Client ID mismatch (if verification enabled)');
      return null;
    }

    console.log('✅ [GET_SURVEY_BY_TOKEN] Survey found:', {
      id: survey.id,
      title: survey.title,
      clientId: survey.clientId,
      questionsCount: survey.questions?.length || 0,
      status: survey.status
    });

    return survey;
  } catch (error) {
    console.error('❌ [GET_SURVEY_BY_TOKEN] Error fetching survey by token:', error);
    console.error('📋 [GET_SURVEY_BY_TOKEN] Error details:', {
      name: error.name,
      message: error.message
    });
    throw new Error('Error fetching survey by access token: ' + error.message);
  }
};

// Function to save user responses to a survey
export const saveResponse = async (surveyId, userId, response) => {
  try {
    console.log('🔄 [SAVE_RESPONSE] Saving survey responses...');
    console.log('📋 [SAVE_RESPONSE] Request details:', {
      surveyId,
      userId: userId || 'Anonymous',
      responseCount: response?.length || 0
    });

    // Verify survey exists
    console.log('🔍 [SAVE_RESPONSE] Verifying survey existence...');
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      console.error('❌ [SAVE_RESPONSE] Survey not found with ID:', surveyId);
      throw new Error('Survey not found');
    }

    console.log('✅ [SAVE_RESPONSE] Survey verified:', {
      id: survey.id,
      title: survey.title,
      status: survey.status
    });

    // Check for duplicate responses (if user is authenticated)
    if (userId) {
      console.log('🔍 [SAVE_RESPONSE] Checking for duplicate responses...');
      const existingResponse = await Result.findOne({
        where: { surveyId, userId }
      });

      if (existingResponse) {
        console.log('❌ [SAVE_RESPONSE] User has already responded to this survey');
        console.log('📋 [SAVE_RESPONSE] Existing response:', existingResponse.id);
        throw new Error('User has already responded to this survey');
      }
      console.log('✅ [SAVE_RESPONSE] No duplicate responses found');
    } else {
      console.log('👤 [SAVE_RESPONSE] Anonymous user - skipping duplicate check');
    }

    // Validate response format
    console.log('🔍 [SAVE_RESPONSE] Validating response format...');
    if (!Array.isArray(response) || response.some(item => !item.questionId || !item.answer)) {
      console.error('❌ [SAVE_RESPONSE] Invalid response format');
      console.error('📋 [SAVE_RESPONSE] Response data:', response);
      throw new Error('Invalid response format: questionId and answer required');
    }

    console.log('✅ [SAVE_RESPONSE] Response format validated');

    // Prepare response records
    const resultEntries = response.map(item => ({
      surveyId,
      userId,
      question: item.question,
      answer: item.answer
    }));

    console.log('📤 [SAVE_RESPONSE] Prepared response entries:', resultEntries.length);
    console.log('📋 [SAVE_RESPONSE] First entry sample:', resultEntries[0]);

    // Save all responses
    console.log('💾 [SAVE_RESPONSE] Saving responses to database...');
    const results = await Result.bulkCreate(resultEntries);
    console.log(`✅ [SAVE_RESPONSE] Saved ${results.length} responses for survey ${surveyId}`);
    
    return results;
  } catch (error) {
    console.error('❌ [SAVE_RESPONSE] Error saving responses:', error);
    console.error('📋 [SAVE_RESPONSE] Error details:', {
      name: error.name,
      message: error.message,
      surveyId,
      userId
    });
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to delete a survey (with client verification)
export const deleteSurvey = async (surveyId, clientId = null) => {
  try {
    console.log('🔄 [DELETE_SURVEY] Deleting survey...');
    console.log('📋 [DELETE_SURVEY] Delete details:', { surveyId, clientId });

    // Find the survey
    console.log('🔍 [DELETE_SURVEY] Finding survey by ID...');
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      console.error('❌ [DELETE_SURVEY] Survey not found with ID:', surveyId);
      throw new Error('Survey not found');
    }

    console.log('✅ [DELETE_SURVEY] Survey found:', {
      id: survey.id,
      title: survey.title,
      clientId: survey.clientId
    });

    // Verify client ownership if clientId is provided
    if (clientId) {
      console.log('🔍 [DELETE_SURVEY] Verifying client ownership...');
      if (survey.clientId !== clientId) {
        console.error('❌ [DELETE_SURVEY] Client does not own this survey');
        console.error('📋 [DELETE_SURVEY] Ownership mismatch:', {
          surveyClientId: survey.clientId,
          requestingClientId: clientId
        });
        throw new Error('You do not have permission to delete this survey');
      }
      console.log('✅ [DELETE_SURVEY] Client ownership verified');
    } else {
      console.log('⚠️ [DELETE_SURVEY] No client ID provided - assuming admin delete');
    }

    // Delete the survey
    console.log('💾 [DELETE_SURVEY] Executing survey.destroy()...');
    await survey.destroy();
    console.log(`✅ [DELETE_SURVEY] Survey ${surveyId} deleted successfully`);
    
  } catch (error) {
    console.error('❌ [DELETE_SURVEY] Error deleting survey:', error);
    console.error('📋 [DELETE_SURVEY] Error details:', {
      name: error.name,
      message: error.message,
      surveyId,
      clientId
    });
    throw new Error('Error deleting survey: ' + error.message);
  }
};

// Function to get survey with detailed questions
export const getSurveyWithDetails = async (surveyId) => {
  try {
    console.log('🔄 [GET_SURVEY_DETAILS] Fetching survey with details...');
    console.log('📋 [GET_SURVEY_DETAILS] Survey ID:', surveyId);
    
    console.log('💾 [GET_SURVEY_DETAILS] Executing Survey.findByPk()...');
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      console.error('❌ [GET_SURVEY_DETAILS] Survey not found with ID:', surveyId);
      return null;
    }

    console.log('✅ [GET_SURVEY_DETAILS] Survey details fetched:', {
      id: survey.id,
      title: survey.title,
      clientId: survey.clientId,
      questionsCount: survey.questions?.length || 0,
      status: survey.status
    });

    return survey;
  } catch (error) {
    console.error('❌ [GET_SURVEY_DETAILS] Error fetching survey details:', error);
    console.error('📋 [GET_SURVEY_DETAILS] Error details:', {
      name: error.name,
      message: error.message,
      surveyId
    });
    throw new Error('Error fetching survey details: ' + error.message);
  }
};

// NEW DEBUG FUNCTION: Get client surveys with detailed logging
export const getClientSurveysWithDebug = async (clientId) => {
  try {
    console.log('🐛 [DEBUG_CLIENT_SURVEYS] === DEBUG CLIENT SURVEYS STARTED ===');
    console.log('👤 [DEBUG_CLIENT_SURVEYS] Client ID:', clientId);
    
    if (!clientId) {
      console.error('❌ [DEBUG_CLIENT_SURVEYS] Client ID is required');
      throw new Error('Client ID is required');
    }

    // Test database connection first
    console.log('🔌 [DEBUG_CLIENT_SURVEYS] Testing database connection...');
    try {
      await Survey.sequelize.authenticate();
      console.log('✅ [DEBUG_CLIENT_SURVEYS] Database connection successful');
    } catch (dbError) {
      console.error('❌ [DEBUG_CLIENT_SURVEYS] Database connection failed:', dbError.message);
      throw new Error('Database connection failed: ' + dbError.message);
    }

    // Check if Survey model is properly initialized
    console.log('🔍 [DEBUG_CLIENT_SURVEYS] Checking Survey model...');
    console.log('📋 [DEBUG_CLIENT_SURVEYS] Survey model details:', {
      tableName: Survey.tableName,
      rawAttributes: Object.keys(Survey.rawAttributes),
      hasClientId: 'clientId' in Survey.rawAttributes
    });

    // Execute count query first
    console.log('🔢 [DEBUG_CLIENT_SURVEYS] Counting surveys for client...');
    const surveyCount = await Survey.count({ 
      where: { clientId } 
    });
    console.log(`📊 [DEBUG_CLIENT_SURVEYS] Found ${surveyCount} surveys for client ${clientId}`);

    // Execute find all query
    console.log('💾 [DEBUG_CLIENT_SURVEYS] Executing Survey.findAll()...');
    const surveys = await Survey.findAll({ 
      where: { clientId },
      raw: true // Get plain objects for easier debugging
    });

    console.log(`✅ [DEBUG_CLIENT_SURVEYS] Query successful, found ${surveys.length} surveys`);
    
    // Log each survey found
    surveys.forEach((survey, index) => {
      console.log(`   📄 [DEBUG_CLIENT_SURVEYS] Survey ${index + 1}:`, {
        id: survey.id,
        title: survey.title,
        clientId: survey.clientId,
        status: survey.status,
        createdAt: survey.createdAt,
        questionsCount: survey.questions?.length || 0
      });
    });

    if (surveys.length === 0) {
      console.log('ℹ️ [DEBUG_CLIENT_SURVEYS] No surveys found for this client');
      console.log('🔍 [DEBUG_CLIENT_SURVEYS] Possible reasons:');
      console.log('   - Client has not created any surveys yet');
      console.log('   - Surveys were deleted');
      console.log('   - Client ID might be incorrect');
    }

    return surveys;
  } catch (error) {
    console.error('❌ [DEBUG_CLIENT_SURVEYS] Error in debug function:', error);
    console.error('📋 [DEBUG_CLIENT_SURVEYS] Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Check for specific Sequelize errors
    if (error.name === 'SequelizeDatabaseError') {
      console.error('💾 [DEBUG_CLIENT_SURVEYS] Database error details:', error.parent?.message);
      console.error('💾 [DEBUG_CLIENT_SURVEYS] SQL error code:', error.parent?.code);
    }
    
    throw new Error('Debug client surveys failed: ' + error.message);
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
  getSurveyWithDetails,
  getClientSurveysWithDebug // Add the new debug function
};

export default surveysService;
