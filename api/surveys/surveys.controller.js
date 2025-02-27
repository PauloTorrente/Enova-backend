import * as surveysService from './surveys.service.js'; // Import all functions from the service module
import Survey from './surveys.model.js';

// Controller to create a new survey (admin only)
export const createSurvey = async (req, res) => {
  try {
    console.log('Received request to create survey:', req.body);

    const surveyData = req.body; // Survey data sent from the client
    const survey = await surveysService.createSurvey(surveyData);

    console.log('Survey successfully created:', survey);
    // The response includes the created survey with the access token
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
    console.log('Received response for survey:', req.params.id, req.body);

    const surveyId = req.params.id;
    const userId = req.user?.userId; // Ensure user is authenticated (use userId from JWT)
    if (!userId) {
      console.error('User not authenticated or userId missing');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const response = req.body;

    // Ensure the response contains valid data
    if (!Array.isArray(response) || response.some(item => !item.questionId || !item.answer)) {
      return res.status(400).json({ message: 'Response is missing questionId or answer' });
    }

    // Fetch the survey to get the questions
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Map the response to include the question text
    const resultEntries = response.map(item => {
      const questionObj = survey.questions.find(q => q.questionId === item.questionId);
      return {
        surveyId,
        userId,
        question: questionObj.question, // Add the question text here
        answer: item.answer,            // Store the answer
      };
    });

    // Save all the results
    const savedResponse = await Result.bulkCreate(resultEntries);

    console.log('Response successfully recorded:', savedResponse);
    res.status(200).json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ message: 'Internal error while recording response' });
  }
};

// Controller to delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    console.log(`Received request to delete survey with ID: ${req.params.id}`);

    const surveyId = req.params.id;
    await surveysService.deleteSurvey(surveyId);

    console.log(`Survey successfully deleted: ID ${surveyId}`);
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ message: 'Internal error while deleting survey' });
  }
};
