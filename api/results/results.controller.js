import Result from './results.model.js'; // Import the Result model
import { validateAnswers } from './results.service.js'; // Import the service to validate answers

// Controller to handle the responses for a survey

// This function will handle the process of submitting a result (answering a survey)
export const submitResult = async (req, res) => {
  try {
    const { userId, surveyId, answers } = req.body;

    // Validate answers (you can customize validation in the service)
    const isValid = validateAnswers(answers);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid answers' });
    }

    // Create a new result entry in the database
    const result = await Result.create({
      userId,
      surveyId,
      answers,
    });

    // Respond with success message and the result created
    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// This function will handle fetching results for a specific survey
export const getResultsForSurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;

    // Fetch results for the specified survey from the database
    const results = await Result.findAll({
      where: { surveyId },
    });

    // Respond with the list of results
    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
