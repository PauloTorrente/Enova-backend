import { Op } from 'sequelize';
import Result from './results.model.js'; // Importing the Result model to interact with the database

// Function to save a response to the database
export const saveResponse = async (surveyId, userId, question, answer) => {
  try {
    // Check if the surveyId and userId are valid (optional, could be done in the service layer too)
    if (!surveyId || !userId || !question || !answer) {
      throw new Error('All fields (surveyId, userId, question, and answer) are required');
    }

    // Creating a new response entry in the Result model
    const newResult = await Result.create({
      surveyId,     // Survey ID that the response belongs to
      userId,       // User ID who answered the survey
      question,     // The specific question being answered
      answer,       // The answer provided by the user
    });

    return newResult; // Returning the saved result entry
  } catch (error) {
    // If there's an error, throw it so it can be handled in the service layer
    throw new Error('Error saving response to the database: ' + error.message);
  }
};

// Function to get all responses for a specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    // Ensure surveyId is provided
    if (!surveyId) {
      throw new Error('surveyId is required');
    }

    // Fetching all responses for the specific survey from the Result model
    const responses = await Result.findAll({
      where: {
        surveyId, // Only get results that match the specific survey
      },
    });

    return responses; // Returning the list of responses
  } catch (error) {
    throw new Error('Error fetching responses for survey: ' + error.message);
  }
};

// Function to get all responses for a specific user
export const getUserResponses = async (userId) => {
  try {
    // Ensure userId is provided
    if (!userId) {
      throw new Error('userId is required');
    }

    // Fetching all responses for the specific user from the Result model
    const responses = await Result.findAll({
      where: {
        userId, // Only get results that belong to the specific user
      },
    });

    return responses; // Returning the list of user responses
  } catch (error) {
    throw new Error('Error fetching responses for user: ' + error.message);
  }
};

// Function to get all responses for a specific question in a survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    // Ensure surveyId and question are provided
    if (!surveyId || !question) {
      throw new Error('surveyId and question are required');
    }

    // Fetching all responses for a specific question in a survey
    const responses = await Result.findAll({
      where: {
        surveyId,    // The survey to which the question belongs
        question,    // The specific question being answered
      },
    });

    return responses; // Returning the list of responses for the specific question
  } catch (error) {
    throw new Error('Error fetching responses for question: ' + error.message);
  }
};

// Exporting all repository functions to be used by the service layer
const resultsRepository = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
};

export default resultsRepository;
