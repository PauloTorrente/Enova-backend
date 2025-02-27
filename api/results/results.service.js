import Result from './results.model.js';
import Survey from '../surveys/surveys.model.js';
import { Op } from 'sequelize';

// Function to check if the survey exists
const checkSurveyExistence = async (surveyId) => {
  const survey = await Survey.findByPk(surveyId);
  if (!survey) throw new Error('Survey not found');
  return survey;
};

// Function to save a response for a user
export const saveResponse = async (surveyId, userId, question, answer) => {
  try {
    await checkSurveyExistence(surveyId); // Check if the survey exists before saving the response

    // Save the user's answer in the 'results' table
    const result = await Result.create({
      surveyId, // Linking the response to the survey
      userId,   // Linking the response to the user
      question, // The question asked in the survey
      answer,   // The answer provided by the user
    });

    return result; // Return the saved response
  } catch (error) {
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to get all responses for a particular survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    // Find all responses linked to a specific survey
    const responses = await Result.findAll({
      where: {
        surveyId: surveyId, // Filter by survey ID
      },
    });

    if (!responses.length) {
      throw new Error('No responses found for this survey');
    }

    return responses; // Return the list of responses
  } catch (error) {
    throw new Error('Error fetching survey responses: ' + error.message);
  }
};

// Function to get all responses from a specific user
export const getUserResponses = async (userId) => {
  try {
    // Find all responses given by a particular user
    const userResponses = await Result.findAll({
      where: {
        userId: userId, // Filter by user ID
      },
    });

    if (!userResponses.length) {
      throw new Error('No responses found for this user');
    }

    return userResponses; // Return the list of responses from the user
  } catch (error) {
    throw new Error('Error fetching user responses: ' + error.message);
  }
};

// Function to get responses for a specific question from a survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    // Find all responses for a specific survey and question
    const responses = await Result.findAll({
      where: {
        surveyId: surveyId, // Filter by survey ID
        question: question,  // Filter by the question
      },
    });

    if (!responses.length) {
      throw new Error('No responses found for this question');
    }

    return responses; // Return the responses for the specific question
  } catch (error) {
    throw new Error('Error fetching responses for the question: ' + error.message);
  }
};

// Exporting the results service for use in other parts of the application
const resultsService = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
};

export default resultsService;
