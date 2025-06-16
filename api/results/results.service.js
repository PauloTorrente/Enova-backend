import Result from './results.model.js'; // Importing the Result model
import Survey from '../surveys/surveys.model.js'; // Importing the Survey model to check the survey details
import * as resultsRepository from './results.repository.js'; //Importing to see each user's answer
import User from '../users/users.model.js';//Importing the users information
import { Op } from 'sequelize'; // Importing Sequelize operators to perform various query conditions
import { sequelize } from '../../config/database.js'; //Import the database

// Function to check if the survey exists
const checkSurveyExistence = async (surveyId) => {
  console.log('Checking survey existence...'); // Debugging log
  const survey = await Survey.findByPk(surveyId);
  if (!survey) {
    console.log('Survey not found'); // Debugging log
    throw new Error('Survey not found');
  }
  console.log('Survey found:', survey); // Debugging log
  return survey;
};

// Function to save a response for a user
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
    console.log('Starting saveResponse...'); // Debugging log
    console.log('Parameters:', { surveyId, userId, surveyTitle, question, answer }); // Debugging log

    // Save the user's answer in the 'results' table
    const result = await Result.create({
      surveyId, // Linking the response to the survey
      userId, // Linking the response to the user
      surveyTitle, // Storing the survey title
      question, // The question asked in the survey
      answer, // The answer provided by the user
    });

    console.log('Response saved successfully:', result); // Debugging log
    return result; // Return the saved response
  } catch (error) {
    console.error('Error saving response:', error); // Debugging log
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to get all responses for a particular survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    console.log('Starting getResponsesBySurvey...'); // Debugging log
    console.log('Survey ID:', surveyId); // Debugging log

    // Find all responses linked to a specific survey
    const responses = await Result.findAll({
      where: {
        surveyId: surveyId, // Filter by survey ID
      },
    });

    console.log('Fetched Responses:', responses); // Debugging log

    if (!responses.length) {
      console.log('No responses found for this survey'); // Debugging log
      throw new Error('No responses found for this survey');
    }

    return responses; // Return the list of responses
  } catch (error) {
    console.error('Error fetching survey responses:', error); // Debugging log
    throw new Error('Error fetching survey responses: ' + error.message);
  }
};

// Function to get all responses from a specific user
export const getUserResponses = async (userId) => {
  try {
    console.log('Starting getUserResponses...'); // Debugging log
    console.log('User ID:', userId); // Debugging log

    // Find all responses given by a particular user
    const userResponses = await Result.findAll({
      where: {
        userId: userId, // Filter by user ID
      },
    });

    console.log('Fetched User Responses:', userResponses); // Debugging log

    if (!userResponses.length) {
      console.log('No responses found for this user'); // Debugging log
      throw new Error('No responses found for this user');
    }

    return userResponses; // Return the list of responses from the user
  } catch (error) {
    console.error('Error fetching user responses:', error); // Debugging log
    throw new Error('Error fetching user responses: ' + error.message);
  }
};

// Function to get responses for a specific question from a survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    console.log('Starting getResponsesByQuestion...'); // Debugging log
    console.log('Parameters:', { surveyId, question }); // Debugging log

    // Find all responses for a specific survey and question
    const responses = await Result.findAll({
      where: {
        surveyId: surveyId, // Filter by survey ID
        question: question, // Filter by the question
      },
    });

    console.log('Fetched Responses for Question:', responses); // Debugging log

    if (!responses.length) {
      console.log('No responses found for this question'); // Debugging log
      throw new Error('No responses found for this question');
    }

    return responses; // Return the responses for the specific question
  } catch (error) {
    console.error('Error fetching responses for the question:', error); // Debugging log
    throw new Error('Error fetching responses for the question: ' + error.message);
  }
};

// Function to export responses to Excel
export const exportResponsesToExcel = async (surveyId) => {
  const responses = await getResponsesBySurvey(surveyId);
  return responses.map(r => ({
    ...r.get({ plain: true }),
    answer: r.answer.replace(/^"(.*)"$/, '$1') // Limpa aspas
  }));
};

// This is like a middleman between controller and repository
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    console.log(`[DEBUG] Fetching responses with user details for survey: ${surveyId}`);
    
    // Verify User model is properly imported
    if (!User) {
      console.error('[ERROR] User model is not imported properly');
      throw new Error('User model not available');
    }
    
    // Log sequelize models to verify associations
    console.log('[DEBUG] Sequelize models:', sequelize.models);
    
    const responses = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User,
        as: 'user', // Must match the association alias
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

// Exporting the results service for use in other parts of the application
const resultsService = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  exportResponsesToExcel,
  getSurveyResponsesWithUserDetails
};

export default resultsService;
