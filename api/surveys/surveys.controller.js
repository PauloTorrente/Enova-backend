import * as surveysService from './surveys.service.js'; // Importing all functions from the service module

// Controller to create a new survey (admin only)
export const createSurvey = async (req, res) => {
  try {
    const surveyData = req.body; // Survey data sent from the client
    const survey = await surveysService.createSurvey(surveyData);
    res.status(201).json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller to get a survey by ID
export const getSurveyById = async (req, res) => {
  try {
    const surveyId = req.params.id;
    const survey = await surveysService.getSurveyById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    res.status(200).json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller to get active surveys
export const getActiveSurveys = async (req, res) => {
  try {
    const activeSurveys = await surveysService.getActiveSurveys();
    res.status(200).json(activeSurveys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller to respond to a survey
export const respondToSurvey = async (req, res) => {
  try {
    // Logic for saving responses to survey (not shown here, will involve Results model)
    const response = req.body;
    res.status(200).json({ message: 'Response recorded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller to delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    const surveyId = req.params.id;
    await surveysService.deleteSurvey(surveyId);
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
