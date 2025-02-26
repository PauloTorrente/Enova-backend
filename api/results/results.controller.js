import * as resultsService from './results.service.js'; // Import all functions from the service module

// Controller to save the results of a survey
export const saveSurveyResults = async (req, res) => {
  try {
    const surveyId = req.params.id;
    const userId = req.user?.userId; // Ensure the user is authenticated (use userId from JWT)
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const response = req.body; // Response should be an array of question-answer pairs

    // Ensure the response contains valid data
    if (!Array.isArray(response) || response.some(item => !item.questionId || !item.answer)) {
      return res.status(400).json({ message: 'Response is missing questionId or answer' });
    }

    const savedResults = await resultsService.saveResults(surveyId, userId, response);
    
    return res.status(200).json({ message: 'Results saved successfully', results: savedResults });
  } catch (error) {
    console.error('Error saving survey results:', error);
    return res.status(500).json({ message: 'Internal server error while saving results' });
  }
};
