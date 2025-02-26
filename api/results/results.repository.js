import { Op } from 'sequelize';
import Result from './results.model.js'; // Importing the Result model to interact with the database

// Function to save a response to the database
export const saveResponse = async (surveyId, userId, question, answer) => {
  try {
    console.log('Starting saveResponse...');
    console.log(`surveyId: ${surveyId}, userId: ${userId}, question: ${question}, answer: ${answer}`);

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

    console.log('Response saved successfully:', newResult);
    return newResult; // Returning the saved result entry
  } catch (error) {
    console.error('Error in saveResponse:', error.message);
    throw new Error('Error saving response to the database: ' + error.message);
  }
};

// Function to get all responses for a specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    console.log('Starting getResponsesBySurvey...');
    console.log(`surveyId: ${surveyId}`);

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

    console.log(`Found ${responses.length} responses for surveyId: ${surveyId}`);
    return responses; // Returning the list of responses
  } catch (error) {
    console.error('Error in getResponsesBySurvey:', error.message);
    throw new Error('Error fetching responses for survey: ' + error.message);
  }
};

// Function to get all responses for a specific user
export const getUserResponses = async (userId) => {
  try {
    console.log('Starting getUserResponses...');
    console.log(`userId: ${userId}`);

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

    console.log(`Found ${responses.length} responses for userId: ${userId}`);
    return responses; // Returning the list of user responses
  } catch (error) {
    console.error('Error in getUserResponses:', error.message);
    throw new Error('Error fetching responses for user: ' + error.message);
  }
};

// Function to get all responses for a specific question in a survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    console.log('Starting getResponsesByQuestion...');
    console.log(`surveyId: ${surveyId}, question: ${question}`);

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

    console.log(`Found ${responses.length} responses for surveyId: ${surveyId}, question: ${question}`);
    return responses; // Returning the list of responses for the specific question
  } catch (error) {
    console.error('Error in getResponsesByQuestion:', error.message);
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
