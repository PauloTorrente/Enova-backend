import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Helper function to normalize survey questions with null safety
const normalizeSurveyQuestions = (survey) => {
  // Check if survey is null or undefined
  if (!survey) {
    console.error('❌ Survey normalization failed: Survey is null');
    return null;
  }
  
  let questions = survey.questions;
  
  // If questions is string, parse to object
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (error) {
      console.error('❌ Error parsing questions JSON');
      questions = [];
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(questions)) {
    questions = [];
  }

  // Process each question to ensure selectionLimit is correct
  const processedQuestions = questions.map((question, index) => {
    // If it's a multiple question with selectionLimit, ensure it's a number
    if (question.type === 'multiple' && 
        (question.multipleSelections === 'yes' || question.multipleSelections === true) &&
        question.selectionLimit != null) {
      
      // Convert to number if it's a string
      if (typeof question.selectionLimit === 'string') {
        const parsedLimit = parseInt(question.selectionLimit);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          question.selectionLimit = parsedLimit;
        } else {
          question.selectionLimit = null;
        }
      }
      
      // If it's still not a number, try to convert anyway
      if (typeof question.selectionLimit !== 'number') {
        const convertedLimit = Number(question.selectionLimit);
        if (!isNaN(convertedLimit) && convertedLimit > 0) {
          question.selectionLimit = convertedLimit;
        } else {
          question.selectionLimit = null;
        }
      }
    }

    // Ensure otherOption is boolean and otherOptionText has default
    if (question.type === 'multiple') {
      if (question.otherOption === undefined) {
        question.otherOption = false;
      }
      if (question.otherOption === true && !question.otherOptionText) {
        question.otherOptionText = 'Other (specify)';
      }
    }

    return question;
  });

  // Return all properties explicitly to ensure proper structure
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questions: processedQuestions,
    expirationTime: survey.expirationTime,
    status: survey.status,
    accessToken: survey.accessToken,
    clientId: survey.clientId,
    responseLimit: survey.responseLimit,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt
  };
};

// Helper function to normalize "other" option responses
export const normalizeOtherOptionResponse = (question, answer) => {
  if (!question.otherOption) {
    return answer;
  }
  
  // If answer is an object with otherText (new format)
  if (typeof answer === 'object' && answer !== null && answer.otherText !== undefined) {
    // For multiple selection
    if (Array.isArray(answer.selectedOptions)) {
      const finalAnswer = [...answer.selectedOptions];
      
      // If there is text in "other", add as special option
      if (answer.otherText && answer.otherText.trim()) {
        const otherTextValue = `${question.otherOptionText || 'Other'}: ${answer.otherText}`;
        finalAnswer.push(otherTextValue);
      }
      
      return finalAnswer;
    } 
    // For single selection
    else if (answer.selectedOption) {
      if (answer.selectedOption === 'other' && answer.otherText && answer.otherText.trim()) {
        const otherAnswer = `${question.otherOptionText || 'Other'}: ${answer.otherText}`;
        return otherAnswer;
      } else if (answer.selectedOption !== 'other') {
        return answer.selectedOption;
      }
    }
  }
  
  // If it's already a string starting with "Other: " (old format)
  if (typeof answer === 'string' && answer.startsWith('Other: ')) {
    return answer;
  }
  
  // If it's an array that contains "other" as string
  if (Array.isArray(answer) && answer.includes('other')) {
    return answer.filter(item => item !== 'other'); // Remove "other" without text
  }
  
  return answer;
};

// Function to generate a unique token for a survey
export const generateSurveyToken = () => {
  const token = crypto.randomBytes(20).toString('hex');
  console.log(`🔐 [generateSurveyToken] Generated token: ${token} (length: ${token.length})`);
  return token;
};

// Function to create a new survey
export const createSurvey = async (surveyData, clientId = null) => {
  try {
    console.log('📝 [createSurvey] Creating survey...');
    console.log(`   Title: ${surveyData.title}`);
    console.log(`   Questions: ${surveyData.questions?.length || 0}`);
    
    // Log antes de verificar o token
    console.log(`🔐 [createSurvey] Current accessToken in surveyData: ${surveyData.accessToken || 'undefined'}`);

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

    // CRITICAL FIX: Only generate token if not already provided
    if (!surveyData.accessToken) {
      const token = generateSurveyToken();
      console.log(`🔐 [createSurvey] Generating new accessToken: ${token}`);
      surveyData.accessToken = token;
    } else {
      console.log(`🔐 [createSurvey] Using provided accessToken: ${surveyData.accessToken}`);
    }
    
    // Log após definir/manter o token
    console.log(`🔐 [createSurvey] accessToken final: ${surveyData.accessToken}`);
    
    // If clientId is provided, associate survey with the client
    if (clientId) {
      surveyData.clientId = clientId;
    }

    // Validate response limit if provided
    if (surveyData.responseLimit) {
      if (surveyData.responseLimit < 1 || surveyData.responseLimit > 1000) {
        throw new Error('Response limit must be between 1 and 1000');
      }
    }
    
    // Validate each question structure
    surveyData.questions.forEach((question, index) => {
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
        }
        
        // Validate other option
        if (question.otherOption === true) {
          if (!question.otherOptionText || typeof question.otherOptionText !== 'string') {
            throw new Error(`Question ${index + 1}: otherOptionText is required when otherOption is enabled`);
          }
          
          if (question.otherOptionText.trim().length === 0) {
            throw new Error(`Question ${index + 1}: otherOptionText cannot be empty`);
          }
        } else {
          question.otherOption = false;
          question.otherOptionText = null;
        }
        
        // Validate selection limit for multiple selection questions
        if (question.multipleSelections === 'yes' && question.selectionLimit) {
          // Ensure selectionLimit is a number
          if (typeof question.selectionLimit === 'string') {
            const parsedLimit = parseInt(question.selectionLimit);
            if (!isNaN(parsedLimit)) {
              question.selectionLimit = parsedLimit;
            }
          }
          
          if (typeof question.selectionLimit !== 'number' || question.selectionLimit < 1) {
            throw new Error(`Question ${index + 1}: selectionLimit must be a positive number`);
          }
          
          if (question.selectionLimit > question.options.length) {
            throw new Error(`Question ${index + 1}: selectionLimit cannot exceed the number of available options`);
          }
          
          if (question.selectionLimit === 1) {
            throw new Error(`Question ${index + 1}: For single selection, set multipleSelections to "no" instead of using selectionLimit`);
          }
        }
        
        // Validate that selectionLimit is not used for single selection
        if (question.multipleSelections === 'no' && question.selectionLimit) {
          throw new Error(`Question ${index + 1}: selectionLimit is only allowed for multiple selection questions (multipleSelections: "yes")`);
        }
      }
    });

    // Log antes de criar no banco
    console.log(`🔐 [createSurvey] Final surveyData.accessToken before create: ${surveyData.accessToken}`);
    
    // Create the survey in database
    const survey = await Survey.create(surveyData);
    
    console.log('✅ [createSurvey] Survey created successfully');
    console.log(`   ID: ${survey.id}`);
    console.log(`   Access Token from DB: ${survey.accessToken || 'NOT SAVED (field missing)'}`);
    console.log(`   Client ID: ${survey.clientId || 'Admin'}`);
    
    // Verifique todas as propriedades retornadas
    console.log('📋 [createSurvey] All properties returned from Survey.create:');
    Object.keys(survey.dataValues).forEach(key => {
      console.log(`   ${key}: ${survey.dataValues[key]}`);
    });
    
    // IMPORTANTE: Se o token não foi salvo, adiciona manualmente ao objeto de retorno
    if (!survey.accessToken && surveyData.accessToken) {
      console.log(`🔐 [createSurvey] Adding accessToken manually to response: ${surveyData.accessToken}`);
      survey.accessToken = surveyData.accessToken;
    }
    
    return survey;
  } catch (error) {
    console.error('❌ [createSurvey] Survey creation failed:', error.message);
    
    // Specific logging for Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      console.error('   Validation errors:');
      error.errors.forEach((err, index) => {
        console.error(`   ${index + 1}. ${err.path}: ${err.message}`);
      });
    }
    
    throw new Error('Error creating survey: ' + error.message);
  }
};

// Function to get active surveys (optionally filtered by client)
export const getActiveSurveys = async (clientId = null) => {
  try {
    console.log('🔍 Fetching active surveys...');

    // Prepare base query conditions
    const whereConditions = {
      status: 'active',
      expirationTime: { [Op.gt]: new Date() }
    };

    // Add client filter if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
    }

    // Execute query
    const surveys = await Survey.findAll({ where: whereConditions });
    
    console.log(`✅ Found ${surveys.length} active surveys`);
    
    // Normalize questions for each survey with null safety
    const normalizedSurveys = surveys
      .map(survey => normalizeSurveyQuestions(survey))
      .filter(survey => survey !== null);
    
    return normalizedSurveys;
  } catch (error) {
    console.error('❌ Error fetching active surveys:', error.message);
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Function to get a survey by access token (with optional client verification)
export const getSurveyByAccessToken = async (accessToken, clientId = null) => {
  try {
    console.log('🔍 Fetching survey by token...');

    // Prepare query conditions
    const whereConditions = { accessToken };
    
    // Add client verification if clientId is provided
    if (clientId) {
      whereConditions.clientId = clientId;
    }

    // Find the survey
    const survey = await Survey.findOne({ 
      where: whereConditions,
      raw: false
    });

    if (!survey) {
      console.error('❌ Survey not found or access denied');
      return null;
    }

    console.log(`✅ Survey found: ${survey.title} (ID: ${survey.id})`);

    // Normalize questions before returning
    const normalizedSurvey = normalizeSurveyQuestions(survey);
    
    // Check if normalization failed
    if (!normalizedSurvey) {
      console.error('❌ Failed to normalize survey questions');
      return null;
    }
    
    // Return the normalized survey as plain object with proper questions structure
    const result = {
      id: normalizedSurvey.id,
      title: normalizedSurvey.title,
      description: normalizedSurvey.description,
      questions: normalizedSurvey.questions,
      expirationTime: normalizedSurvey.expirationTime,
      status: normalizedSurvey.status,
      accessToken: normalizedSurvey.accessToken,
      clientId: normalizedSurvey.clientId,
      responseLimit: normalizedSurvey.responseLimit,
      createdAt: normalizedSurvey.createdAt,
      updatedAt: normalizedSurvey.updatedAt
    };

    return result;
  } catch (error) {
    console.error('❌ Error fetching survey by token:', error.message);
    throw new Error('Error fetching survey by access token: ' + error.message);
  }
};

// Function to save user responses to a survey
export const saveResponse = async (surveyId, userId, response) => {
  try {
    console.log('💾 Saving survey responses...');
    console.log(`   Survey ID: ${surveyId}`);
    console.log(`   User ID: ${userId || 'Anonymous'}`);
    console.log(`   Responses: ${response?.length || 0}`);

    // Verify survey exists
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check for duplicate responses (if user is authenticated)
    if (userId) {
      const existingResponse = await Result.findOne({
        where: { surveyId, userId }
      });

      if (existingResponse) {
        console.error('❌ User has already responded to this survey');
        throw new Error('User has already responded to this survey');
      }
    }

    // Validate response format
    if (!Array.isArray(response) || response.some(item => !item.questionId || item.answer === undefined)) {
      throw new Error('Invalid response format: questionId and answer required');
    }

    // Get survey questions for validation
    const normalizedSurvey = normalizeSurveyQuestions(survey);
    
    // Check if normalization failed
    if (!normalizedSurvey) {
      throw new Error('Failed to process survey questions');
    }
    
    const questions = normalizedSurvey.questions;

    // Prepare response records with normalization
    const resultEntries = response.map(item => {
      const question = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );
      
      let finalAnswer = item.answer;
      let questionText = item.question || (question ? question.question : `Question ${item.questionId}`);
      
      // Normalize answer if question has other option
      if (question && question.otherOption === true) {
        finalAnswer = normalizeOtherOptionResponse(question, item.answer);
      }
      
      return {
        surveyId,
        userId,
        question: questionText,
        answer: finalAnswer
      };
    });

    // Save all responses
    const results = await Result.bulkCreate(resultEntries);
    console.log(`✅ Saved ${results.length} responses for survey ${surveyId}`);
    
    return results;
  } catch (error) {
    console.error('❌ Error saving responses:', error.message);
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to delete a survey (with client verification)
export const deleteSurvey = async (surveyId, clientId = null) => {
  try {
    console.log('🗑️  Deleting survey...');
    console.log(`   Survey ID: ${surveyId}`);
    console.log(`   Client ID: ${clientId || 'Admin'}`);

    // Find the survey
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Verify client ownership if clientId is provided
    if (clientId) {
      if (survey.clientId !== clientId) {
        console.error('❌ Client does not own this survey');
        throw new Error('You do not have permission to delete this survey');
      }
    }

    // Delete the survey
    await survey.destroy();
    console.log(`✅ Survey ${surveyId} deleted successfully`);
    
  } catch (error) {
    console.error('❌ Error deleting survey:', error.message);
    throw new Error('Error deleting survey: ' + error.message);
  }
};

// Function to get survey with detailed questions
export const getSurveyWithDetails = async (surveyId) => {
  try {
    console.log(`🔍 Fetching survey details for ID: ${surveyId}`);
    
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
      console.error('❌ Survey not found');
      return null;
    }

    // Normalize questions before returning
    const normalizedSurvey = normalizeSurveyQuestions(survey);
    
    // Check if normalization failed
    if (!normalizedSurvey) {
      console.error('❌ Failed to normalize survey questions');
      return null;
    }
    
    console.log(`✅ Survey details retrieved: ${normalizedSurvey.title}`);
    return normalizedSurvey;
  } catch (error) {
    console.error('❌ Error fetching survey details:', error.message);
    throw new Error('Error fetching survey details: ' + error.message);
  }
};

// NEW DEBUG FUNCTION: Get client surveys with detailed logging
export const getClientSurveysWithDebug = async (clientId) => {
  try {
    console.log(`🔍 Debug: Fetching surveys for client ID: ${clientId}`);
    
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    // Test database connection first
    try {
      await Survey.sequelize.authenticate();
    } catch (dbError) {
      console.error('❌ Database connection failed');
      throw new Error('Database connection failed: ' + dbError.message);
    }

    // Execute count query first
    const surveyCount = await Survey.count({ where: { clientId } });
    console.log(`📊 Found ${surveyCount} surveys for client ${clientId}`);

    // Execute find all query
    const surveys = await Survey.findAll({ 
      where: { clientId },
      raw: false
    });

    console.log(`✅ Query successful, found ${surveys.length} surveys`);
    
    // Normalize questions for each survey with null safety
    const normalizedSurveys = surveys
      .map(survey => normalizeSurveyQuestions(survey))
      .filter(survey => survey !== null);
    
    if (normalizedSurveys.length === 0) {
      console.log('ℹ️ No surveys found for this client');
    }

    return normalizedSurveys;
  } catch (error) {
    console.error('❌ Debug function error:', error.message);
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
  getClientSurveysWithDebug,
  normalizeSurveyQuestions,
  normalizeOtherOptionResponse  
};

export default surveysService;
