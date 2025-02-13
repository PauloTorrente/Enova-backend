import * as surveysService from './surveys.service.js'; // Importing all functions from the service module

// Controller to create a new survey (admin only)
export const createSurvey = async (req, res) => {
  try {
    console.log('Receiving request to create survey:', req.body);

    const surveyData = req.body; // Survey data sent from the client
    const survey = await surveysService.createSurvey(surveyData);

    console.log('Survey successfully created:', survey);
    res.status(201).json(survey);
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ message: 'Internal error while creating survey' });
  }
};

// Controller to get a survey by ID
export const getSurveyById = async (req, res) => {
  try {
    console.log(`Fetching survey with ID: ${req.params.id}`);

    const surveyId = req.params.id;
    const survey = await surveysService.getSurveyById(surveyId);

    if (!survey) {
      console.warn(`Survey not found: ID ${surveyId}`);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log('Survey found:', survey);
    res.status(200).json(survey);
  } catch (error) {
    console.error('Error fetching survey by ID:', error);
    res.status(500).json({ message: 'Internal error while fetching survey' });
  }
};

// Controller to get active surveys
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('Fetching active surveys...');
    const activeSurveys = await surveysService.getActiveSurveys();

    console.log(`Found ${activeSurveys.length} active surveys`);
    res.status(200).json(activeSurveys);
  } catch (error) {
    console.error('Error fetching active surveys:', error);
    res.status(500).json({ message: 'Internal error while fetching active surveys' });
  }
};

// Controller to respond to a survey
export const respondToSurvey = async (req, res) => {
  try {
    console.log('Receiving response for survey:', req.params.id, req.body);

    // Logic to save responses (not implemented here)
    const response = req.body;

    console.log('Response successfully recorded:', response);
    res.status(200).json({ message: 'Response recorded' });
  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ message: 'Internal error while recording response' });
  }
};

// Controller to delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    console.log(`Receiving request to delete survey with ID: ${req.params.id}`);

    const surveyId = req.params.id;
    await surveysService.deleteSurvey(surveyId);

    console.log(`Survey successfully deleted: ID ${surveyId}`);
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ message: 'Internal error while deleting survey' });
  }
};
