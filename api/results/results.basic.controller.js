import * as resultsService from './results.service.js';
import { validationResult } from 'express-validator';
import { exportResponsesToExcel } from './exportResponsesToExcel.js';

// Controller function to save a survey response
export const saveResponse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Log only the field names that failed, not the submitted values.
      console.warn('[results.basic.controller] saveResponse validation failed:', errors.array().map(e => e.path));
      return res.status(400).json({ errors: errors.array() });
    }

    const { surveyId, userId, questionId, answer } = req.body;
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
    // Log surveyId/userId for traceability without dumping the answer payload.
    console.error(`[results.basic.controller] saveResponse failed (surveyId=${req.body?.surveyId}, userId=${req.body?.userId}):`, error.message);
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
    console.error(`[results.basic.controller] getUserResponses failed (userId=${req.params?.userId}):`, error.message);
    return res.status(500).json({
      message: 'Error fetching user responses',
      error: error.message,
    });
  }
};

// Export responses to Excel
export { exportResponsesToExcel };
