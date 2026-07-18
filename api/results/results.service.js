import Result from './results.model.js'; // Result model import
import Survey from '../surveys/surveys.model.js'; // Survey model for validation
import * as resultsRepository from './results.repository.js'; // Repository functions
import User from '../users/users.model.js'; // User model for associations
import { Op } from 'sequelize'; // Sequelize operators for queries
import { sequelize } from '../../config/database.js'; // DB connection

// Check if survey exists in DB
const checkSurveyExistence = async (surveyId) => {
  const survey = await Survey.findByPk(surveyId);
  if (!survey) throw new Error('Survey not found');
  return survey;
};

// Save survey response with multiple choice support
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
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
    console.error(`[results.service] saveResponse failed (surveyId=${surveyId}, userId=${userId}):`, error.message);
    throw new Error('Save failed: ' + error.message);
  }
};

// Get all responses for specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    // Use repository function instead of direct model call for consistency
    const responses = await resultsRepository.getResponsesBySurvey(surveyId);

    if (!responses.length) throw new Error('No responses found');
    return responses;
  } catch (error) {
    console.error(`[results.service] getResponsesBySurvey failed (surveyId=${surveyId}):`, error.message);
    throw new Error('Fetch failed: ' + error.message);
  }
};

// Get all responses from specific user
export const getUserResponses = async (userId) => {
  try {
    // Use repository function instead of direct model call for consistency
    const userResponses = await resultsRepository.getUserResponses(userId);

    if (!userResponses.length) throw new Error('No user responses found');
    return userResponses;
  } catch (error) {
    console.error(`[results.service] getUserResponses failed (userId=${userId}):`, error.message);
    throw new Error('User fetch failed: ' + error.message);
  }
};

// Get responses for specific question
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    // Use repository function instead of direct model call for consistency
    const responses = await resultsRepository.getResponsesByQuestion(surveyId, question);

    if (!responses.length) throw new Error('No question responses found');
    return responses;
  } catch (error) {
    console.error(`[results.service] getResponsesByQuestion failed (surveyId=${surveyId}):`, error.message);
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

// Get responses with user demographic data attached (used by admin/client
// dashboards that segment results by demographics)
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    const responses = await resultsRepository.getSurveyResponsesWithUserDetails(surveyId);
    return responses;
  } catch (error) {
    console.error(`[results.service] getSurveyResponsesWithUserDetails failed (surveyId=${surveyId}):`, error.message);
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
