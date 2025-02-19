import Result from './results.model.js'; // Importing the Result model
import Survey from '../surveys/surveys.model.js'; // Importing the Survey model to check the survey details
import { Op } from 'sequelize'; // Importing Sequelize operators to perform various query conditions

// Function to save a response for a user
export const saveResponse = async (surveyId, userId, question, answer) => {
  try {
    // Check if the survey exists
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found'); // If the survey doesn't exist, throw an error
    }

    // Save the user's answer in the 'results' table
    const result = await Result.create({
      surveyId, // Linking the response to the survey
      userId,   // Linking the response to the user
      question, // The question asked in the survey
      answer,   // The answer provided by the user
    });

    return result; // Return the saved response
  } catch (error) {
    throw new Error('Error saving response: ' + error.message); // If any error occurs, throw an error with the message
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

    return responses; // Return the list of responses
  } catch (error) {
    throw new Error('Error fetching survey responses: ' + error.message); // If any error occurs, throw an error
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

    return userResponses; // Return the list of responses from the user
  } catch (error) {
    throw new Error('Error fetching user responses: ' + error.message); // If any error occurs, throw an error
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

    return responses; // Return the responses for the specific question
  } catch (error) {
    throw new Error('Error fetching responses for the question: ' + error.message); // If any error occurs, throw an error
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
