import * as resultsService from './results.service.js'; // Importing the results service to interact with the results data
import { validationResult } from 'express-validator'; // Importing express-validator to validate incoming requests
import Survey from '../surveys/surveys.model.js'; // Importing the Survey model to fetch survey details
import { exportResponsesToExcel } from './exportResponsesToExcel.js'; // Import the export function for Excel

// Controller function to save a response for a survey
export const saveResponse = async (req, res) => {
  try {
    console.log('Starting saveResponse...'); // Debugging log

    const errors = validationResult(req); // Check if the request has validation errors
    if (!errors.isEmpty()) {
      console.log('Validation failed', errors.array()); // Debugging log
      return res.status(400).json({ errors: errors.array() }); // Return validation error
    }

    const { surveyId, userId, questionId, answer } = req.body; // Get data from the request body
    console.log('Request Body:', { surveyId, userId, questionId, answer }); // Debugging log

    const survey = await Survey.findByPk(surveyId); // Get the survey using its ID
    if (!survey) {
      console.log('Survey not found'); // Debugging log
      return res.status(404).json({ message: 'Survey not found' });
    }

    const questionObj = survey.questions.find(q => q.questionId === questionId); // Find the question in the survey
    if (!questionObj) {
      console.log('Question not found in the survey'); // Debugging log
      return res.status(404).json({ message: 'Question not found in the survey' });
    }

    const questionText = questionObj.question; // Get question text
    const surveyTitle = survey.title; // Get the survey title

    const result = await resultsService.saveResponse(
      surveyId,
      userId,
      surveyTitle,
      questionText,
      answer
    ); // Save the response

    return res.status(201).json({
      message: 'Response saved successfully!',
      result: result,
    });
  } catch (error) {
    console.error('Error saving response:', error); // Debugging log
    return res.status(500).json({
      message: 'Error saving response',
      error: error.message,
    });
  }
};

// Controller to get all responses for a survey
export const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID is required' });
    }

    const responses = await resultsService.getResponsesBySurvey(surveyId);
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    return res.status(200).json({
      message: 'Responses fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    console.error('Error in getResponsesBySurvey:', error); // Debugging log
    return res.status(500).json({
      message: 'Error fetching responses for the survey',
      error: error.message,
    });
  }
};

// Controller to get all responses by user
export const getUserResponses = async (req, res) => {
  try {
    const { userId } = req.params;
    const userResponses = await resultsService.getUserResponses(userId);

    if (userResponses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this user.' });
    }

    return res.status(200).json({
      message: 'User responses fetched successfully!',
      userResponses: userResponses,
    });
  } catch (error) {
    console.error('Error fetching user responses:', error); // Debugging log
    return res.status(500).json({
      message: 'Error fetching user responses',
      error: error.message,
    });
  }
};

// Controller to get responses for a specific question
export const getResponsesByQuestion = async (req, res) => {
  try {
    const { surveyId, question } = req.params;
    const responses = await resultsService.getResponsesByQuestion(surveyId, question);

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this question.' });
    }

    return res.status(200).json({
      message: 'Responses for the question fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    console.error('Error fetching responses for the question:', error); // Debugging log
    return res.status(500).json({
      message: 'Error fetching responses for the question',
      error: error.message,
    });
  }
};

// Export the function directly with the same name
export { exportResponsesToExcel };

// Get detailed survey responses with user info
export const getSurveyResponsesWithUserDetails = async (req, res) => {
  const { surveyId } = req.params;
  
  try {
    console.log(`[CONTROLLER] Fetching responses for survey: ${surveyId}`);
    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    
    if (!responses || responses.length === 0) {
      console.log(`[CONTROLLER] No responses found for survey: ${surveyId}`);
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    // Format the response data
    const formatted = responses.map(r => {
      // Check if user data exists
      if (!r.user) {
        console.warn(`[WARNING] Response ${r.id} has no user data associated`);
        return {
          id: r.id,
          question: r.question,
          answer: r.answer,
          user: null
        };
      }
      
      return {
        id: r.id,
        question: r.question,
        answer: r.answer,
        user: {
          id: r.user.id,
          name: `${r.user.firstName} ${r.user.lastName}`,
          email: r.user.email,
          city: r.user.city,
          area: r.user.residentialArea,
          gender: r.user.gender,
          age: r.user.age
        }
      };
    });

    res.status(200).json({
      message: 'Responses with user details fetched successfully!',
      responses: formatted
    });
  } catch (error) {
    console.error('[CONTROLLER ERROR] fetching detailed responses:', error);
    res.status(500).json({ 
      message: 'Error fetching responses with user details',
      error: error.message
    });
  }
};

// Export all controller functions
const resultsController = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  exportResponsesToExcel
};

export default resultsController;
