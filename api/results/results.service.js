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
    
    const responses = await Result.findAll({
      where: { surveyId }
    });

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
    
    const userResponses = await Result.findAll({
      where: { userId }
    });

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
    
    const responses = await Result.findAll({
      where: { surveyId, question }
    });

    if (!responses.length) throw new Error('No question responses found');
    return responses;
  } catch (error) {
    console.error('Question responses error:', error);
    throw new Error('Question fetch failed: ' + error.message);
  }
};

// Format responses for Excel export
export const exportResponsesToExcel = async (surveyId) => {
  const responses = await getResponsesBySurvey(surveyId);
  return responses.map(r => ({
    ...r.get({ plain: true }),
    answer: r.answer.replace(/^"(.*)"$/, '$1') // Clean quotes
  }));
};

// Get responses with user demographic data
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    console.log(`Fetching responses with user details...`);
    
    if (!User) throw new Error('User model not available');
    
    // Query with user data join
    const responses = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User,
        as: 'user', // Association alias
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'residentialArea', 'gender', 'age']
      }]
    });
    
    return responses;
  } catch (error) {
    console.error('User details error:', error);
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
