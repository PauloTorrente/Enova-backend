import Result from './results.model.js'; // Importing the Result model to interact with database
import Survey from '../surveys/surveys.model.js'; // Importing Survey model for survey validation
import * as resultsRepository from './results.repository.js'; // Importing repository functions
import User from '../users/users.model.js'; // Importing User model for user associations
import { Op } from 'sequelize'; // Importing Sequelize operators for complex queries
import { sequelize } from '../../config/database.js'; // Importing database connection

// Helper function to verify survey exists in database
const checkSurveyExistence = async (surveyId) => {
  console.log('Checking survey existence...'); // Debug log
  const survey = await Survey.findByPk(surveyId);
  if (!survey) {
    console.log('Survey not found'); // Error logging
    throw new Error('Survey not found');
  }
  console.log('Survey found:', survey); // Success log
  return survey;
};

// Modified function to save survey responses (now handles multiple choice answers)
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
    console.log('Starting saveResponse...'); // Debug log
    console.log('Parameters:', { surveyId, userId, surveyTitle, question, answer }); // Input logging
    
    // Handle multiple choice answers (convert array to JSON string)
    const formattedAnswer = Array.isArray(answer) ? JSON.stringify(answer) : answer;
    
    // Create new database record with response data
    const result = await Result.create({
      surveyId, // ID of the survey being answered
      userId, // ID of user submitting response
      surveyTitle, // Title of survey for reporting
      question, // The question text
      answer: formattedAnswer // Processed answer (string or JSON)
    });

    console.log('Response saved successfully:', result); // Success log
    return result; // Return created record
  } catch (error) {
    console.error('Error saving response:', error); // Error logging
    throw new Error('Error saving response: ' + error.message); // Re-throw with context
  }
};

// Function to fetch all responses for a specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    console.log('Starting getResponsesBySurvey...'); // Debug log
    console.log('Survey ID:', surveyId); // Parameter logging

    // Query database for all responses matching survey ID
    const responses = await Result.findAll({
      where: {
        surveyId: surveyId, // Filter condition
      },
    });

    console.log('Fetched Responses:', responses); // Result logging

    if (!responses.length) {
      console.log('No responses found for this survey'); // Empty result log
      throw new Error('No responses found for this survey');
    }

    return responses; // Return query results
  } catch (error) {
    console.error('Error fetching survey responses:', error); // Error logging
    throw new Error('Error fetching survey responses: ' + error.message);
  }
};

// Function to get all responses from a specific user
export const getUserResponses = async (userId) => {
  try {
    console.log('Starting getUserResponses...'); // Debug log
    console.log('User ID:', userId); // Parameter logging

    // Query database for responses matching user ID
    const userResponses = await Result.findAll({
      where: {
        userId: userId, // Filter condition
      },
    });

    console.log('Fetched User Responses:', userResponses); // Result logging

    if (!userResponses.length) {
      console.log('No responses found for this user'); // Empty result log
      throw new Error('No responses found for this user');
    }

    return userResponses; // Return query results
  } catch (error) {
    console.error('Error fetching user responses:', error); // Error logging
    throw new Error('Error fetching user responses: ' + error.message);
  }
};

// Function to get responses for specific question in survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    console.log('Starting getResponsesByQuestion...'); // Debug log
    console.log('Parameters:', { surveyId, question }); // Parameter logging

    // Query database for responses matching survey ID and question text
    const responses = await Result.findAll({
      where: {
        surveyId: surveyId, // Survey filter
        question: question, // Question filter
      },
    });

    console.log('Fetched Responses for Question:', responses); // Result logging

    if (!responses.length) {
      console.log('No responses found for this question'); // Empty result log
      throw new Error('No responses found for this question');
    }

    return responses; // Return query results
  } catch (error) {
    console.error('Error fetching responses for the question:', error); // Error logging
    throw new Error('Error fetching responses for the question: ' + error.message);
  }
};

// Function to format responses for Excel export
export const exportResponsesToExcel = async (surveyId) => {
  const responses = await getResponsesBySurvey(surveyId);
  return responses.map(r => ({
    ...r.get({ plain: true }), // Convert Sequelize instance to plain object
    answer: r.answer.replace(/^"(.*)"$/, '$1') // Clean quote formatting
  }));
};

// Function to get responses with associated user demographic data
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    console.log(`[DEBUG] Fetching responses with user details for survey: ${surveyId}`);
    
    // Safety check for model availability
    if (!User) {
      console.error('[ERROR] User model is not imported properly');
      throw new Error('User model not available');
    }
    
    console.log('[DEBUG] Sequelize models:', sequelize.models); // Debug output
    
    // Query with joined user data
    const responses = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User,
        as: 'user', // Association alias
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'residentialArea', 'gender', 'age']
      }]
    });
    
    console.log(`[DEBUG] Found ${responses.length} responses with user details`);
    return responses;
  } catch (error) {
    console.error('[ERROR] in getSurveyResponsesWithUserDetails:', error);
    throw new Error('Service error: ' + error.message);
  }
};

// Export all service functions as module
const resultsService = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  exportResponsesToExcel,
  getSurveyResponsesWithUserDetails
};

export default resultsService;
