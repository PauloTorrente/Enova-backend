import * as resultsService from './results.service.js'; // Importing the results service to interact with the results data
import { validationResult } from 'express-validator'; // Importing express-validator to validate incoming requests
import { authenticateAdmin } from '../../middlewares/auth.middleware.js'; // Importing the authentication middleware for admins

// Controller function to save a response for a survey
export const saveResponse = async (req, res) => {
  try {
    // Validate any request errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() }); // If validation fails, return a 400 error with the error details
    }

    // Extracting data from the request body
    const { surveyId, userId, question, answer } = req.body;

    // Call the resultsService to save the response
    const result = await resultsService.saveResponse(surveyId, userId, question, answer);

    // Return a success response with the saved result
    return res.status(201).json({
      message: 'Response saved successfully!',
      result: result, // Return the saved response details
    });
  } catch (error) {
    // If there's an error, catch it and return a 500 error with the error message
    console.error(error);
    return res.status(500).json({
      message: 'Error saving response',
      error: error.message,
    });
  }
};

// Controller function to get all responses for a specific survey (Admin only)
export const getResponsesBySurvey = async (req, res) => {
  try {
    // The surveyId is now available in req.user, which comes from the JWT token
    const { surveyId } = req.user; // The surveyId is now extracted from the JWT token

    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID is missing in the token' });
    }

    // Call the resultsService to get responses for the survey
    const responses = await resultsService.getResponsesBySurvey(surveyId);

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

// Controller function to get all responses for a specific user (Admin only)
export const getUserResponses = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from request parameters

    // Call the resultsService to get responses for the user
    const userResponses = await resultsService.getUserResponses(userId);

    // If no responses are found, return a 404 error
    if (userResponses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this user.' });
    }

    // Return the user responses in the response body
    return res.status(200).json({
      message: 'User responses fetched successfully!',
      userResponses: userResponses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error fetching user responses',
      error: error.message,
    });
  }
};

// Controller function to get responses for a specific question in a survey (Admin only)
export const getResponsesByQuestion = async (req, res) => {
  try {
    const { surveyId, question } = req.params; // Extract surveyId and question from request parameters

    // Call the resultsService to get responses for a specific question in the survey
    const responses = await resultsService.getResponsesByQuestion(surveyId, question);

    // If no responses are found, return a 404 error
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this question.' });
    }

    // Return the responses in the response body
    return res.status(200).json({
      message: 'Responses for the question fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error fetching responses for the question',
      error: error.message,
    });
  }
};

// Exporting all controller functions for use in routes, with admin authentication where necessary
const resultsController = {
  saveResponse,
  getResponsesBySurvey: authenticateAdmin, // Only admins can access this route
  getUserResponses: authenticateAdmin, // Only admins can access this route
  getResponsesByQuestion: authenticateAdmin, // Only admins can access this route
};

export default resultsController;
