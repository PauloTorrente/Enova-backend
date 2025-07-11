import * as resultsService from './results.service.js';
import { validationResult } from 'express-validator';
import { exportResponsesToExcel } from './exportResponsesToExcel.js';

// Controller function to save a survey response
export const saveResponse = async (req, res) => {
  try {
    console.log('Starting saveResponse...');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation failed', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { surveyId, userId, questionId, answer } = req.body;
    console.log('Request Body:', { surveyId, userId, questionId, answer });

    const result = await resultsService.saveResponse(
      surveyId,
      userId,
      questionId,
      answer
    );

    return res.status(201).json({
      message: 'Response saved successfully!',
      result: result,
    });
  } catch (error) {
    console.error('Error saving response:', error);
    return res.status(500).json({
      message: 'Error saving response',
      error: error.message,
    });
  }
};

// Get all responses for a specific user
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
    console.error('Error fetching user responses:', error);
    return res.status(500).json({
      message: 'Error fetching user responses',
      error: error.message,
    });
  }
};

// Export responses to Excel
export { exportResponsesToExcel };
