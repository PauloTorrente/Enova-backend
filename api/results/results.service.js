import Result from './results.model.js';
import Survey from '../surveys/surveys.model.js'; // Import Survey model to verify survey existence
import { Op } from 'sequelize';

// Function to save the user's response to a survey
export const saveResults = async (surveyId, userId, response) => {
  try {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Iterate over the response and save each question-answer pair
    const resultEntries = response.map(item => {
      return {
        surveyId,
        userId,
        questionId: item.questionId,  // Add the questionId
        answer: item.answer,           // Store the answer (could be an object for multiple choice)
      };
    });

    // Save all the results in bulk for better performance
    const results = await Result.bulkCreate(resultEntries);

    return results;
  } catch (error) {
    throw new Error('Error saving results: ' + error.message);
  }
};

// Other potential methods for managing results could go here (e.g., fetching results, deleting results, etc.)
const resultsService = {
  saveResults
};

export default resultsService;
