import Result from './results.model.js'; // Result model import
import Survey from '../surveys/surveys.model.js'; // Survey model for validation
import * as resultsRepository from './results.repository.js'; // Repository functions
import User from '../users/users.model.js'; // User model for associations
import { Op } from 'sequelize'; // Sequelize operators for queries
import { sequelize } from '../../config/database.js'; // DB connection

// Check if survey exists in DB
const checkSurveyExistence = async (surveyId) => {
  console.log('Checking survey...');
  const survey = await Survey.findByPk(surveyId);
  if (!survey) throw new Error('Survey not found');
  return survey;
};

// Save survey response with multiple choice support
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
    console.log('Saving response...');
    
    // Handle array answers (multiple choice)
    const formattedAnswer = Array.isArray(answer) ? JSON.stringify(answer) : answer;
    
    // Create new response record
    const result = await Result.create({
      surveyId,
      userId, 
      surveyTitle,
      question,
      answer: formattedAnswer
    });

    return result;
  } catch (error) {
    console.error('Save error:', error);
    throw new Error('Save failed: ' + error.message);
  }
};

// Get all responses for specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    console.log('Fetching survey responses...');
    
    // Use repository function instead of direct model call for consistency
    const responses = await resultsRepository.getResponsesBySurvey(surveyId);

    if (!responses.length) throw new Error('No responses found');
    return responses;
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error('Fetch failed: ' + error.message);
  }
};

// Get all responses from specific user
export const getUserResponses = async (userId) => {
  try {
    console.log('Fetching user responses...');
    
    // Use repository function instead of direct model call for consistency
    const userResponses = await resultsRepository.getUserResponses(userId);

    if (!userResponses.length) throw new Error('No user responses found');
    return userResponses;
  } catch (error) {
    console.error('User responses error:', error);
    throw new Error('User fetch failed: ' + error.message);
  }
};

// Get responses for specific question
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    console.log('Fetching question responses...');
    
    // Use repository function instead of direct model call for consistency
    const responses = await resultsRepository.getResponsesByQuestion(surveyId, question);

    if (!responses.length) throw new Error('No question responses found');
    return responses;
  } catch (error) {
    console.error('Question responses error:', error);
    throw new Error('Question fetch failed: ' + error.message);
  }
};

// Format responses for Excel export
export const exportResponsesToExcel = async (surveyId) => {
  // Get responses using repository function
  const responses = await resultsRepository.getResponsesBySurvey(surveyId);
  
  // Format responses for Excel export
  return responses.map(r => ({
    ...r,
    answer: typeof r.answer === 'string' ? r.answer.replace(/^"(.*)"$/, '$1') : r.answer // Clean quotes from stringified answers
  }));
};

// Get responses with user demographic data - UPDATED VERSION WITH FIXED QUESTION FIELD
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    console.log(`🔍 [SERVICE] Fetching responses with user details for survey: ${surveyId}`);
    
    // Use the updated repository function that fixes the question field issue
    const responses = await resultsRepository.getSurveyResponsesWithUserDetails(surveyId);
    
    console.log(`✅ [SERVICE] Retrieved ${responses.length} responses with user details`);
    
    // Additional debug logging to verify question field is populated
    if (responses.length > 0) {
      console.log('📋 [SERVICE] First response details for verification:', {
        id: responses[0].id,
        question: responses[0].question, // This should now be populated
        answer: responses[0].answer,
        userId: responses[0].userId,
        hasUser: !!responses[0].user,
        userData: responses[0].user ? {
          id: responses[0].user.id,
          name: `${responses[0].user.firstName} ${responses[0].user.lastName}`
        } : 'No user data'
      });
    } else {
      console.log('ℹ️ [SERVICE] No responses found for this survey');
    }
    
    return responses;
  } catch (error) {
    console.error('❌ [SERVICE] User details error:', error);
    console.error('🔍 [SERVICE] Error stack:', error.stack);
    throw new Error('User details failed: ' + error.message);
  }
};

// Export all service functions
const resultsService = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  exportResponsesToExcel,
  getSurveyResponsesWithUserDetails
};

export default resultsService;
