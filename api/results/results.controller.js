import Result from './results.model.js'; // Importing the Result model
import Survey from '../surveys/surveys.model.js'; // Importing the Survey model to check the survey details
import { Op } from 'sequelize'; // Importing Sequelize operators to perform various query conditions

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
    throw new Error('Error saving response: ' + error.message); // If any error occurs, throw an error with the message
  }
};

// Function to get all responses for a particular survey
export const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params; // Extract surveyId from URL parameters
    console.log('Extracted Survey ID:', surveyId); // Debugging the extracted surveyId

    // Ensure surveyId is provided and is a valid number
    if (!surveyId || isNaN(surveyId)) {
      return res.status(400).json({ message: 'Survey ID is required and must be a valid number' });
    }

    // Convert surveyId to a number (if it's a string)
    const parsedSurveyId = parseInt(surveyId, 10);

    // Call the resultsService to get responses for the survey
    const responses = await resultsService.getResponsesBySurvey(parsedSurveyId);
    console.log('Fetched Responses:', responses); // Debugging the responses fetched from the service

    // If no responses are found, return a 404 error
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    // Return the responses in the response body
    return res.status(200).json({
      message: 'Responses fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error in getResponsesBySurvey:', error);

    // Return an error message if something goes wrong
    return res.status(500).json({
      message: 'Error fetching responses for the survey',
      error: error.message,
    });
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
      throw new Error('No responses found for this user'); // If no responses found, throw an error
    }

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

    if (!responses.length) {
      throw new Error('No responses found for this question'); // If no responses found, throw an error
    }

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
