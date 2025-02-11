import Result from './results.model.js'; // Import the Result model

// Repository functions to interact with the results table in the database

// Get all results for a specific survey
export const findResultsBySurveyId = async (surveyId) => {
  try {
    const results = await Result.findAll({ where: { surveyId } });
    return results;
  } catch (error) {
    console.error('Error fetching results:', error);
    throw new Error('Error fetching results');
  }
};

// Save a new result (response) to the database
export const createResult = async (userId, surveyId, answers) => {
  try {
    const result = await Result.create({ userId, surveyId, answers });
    return result;
  } catch (error) {
    console.error('Error creating result:', error);
    throw new Error('Error saving result');
  }
};
