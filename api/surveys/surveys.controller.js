import * as surveysService from './surveys.service.js'; // Import all functions from the service module
import Survey from './surveys.model.js'; // Importing the Survey model
import Result from '../results/results.model.js'; // Importing the Result model

// Controller to create a new survey (admin only)
export const createSurvey = async (req, res) => {
  try {
    console.log('Received request to create survey:', req.body); // Debugging log

    const surveyData = req.body; // Survey data sent from the client
    const survey = await surveysService.createSurvey(surveyData);

    console.log('Survey successfully created:', survey); // Debugging log
    // The response includes the created survey with the access token
    res.status(201).json(survey);
  } catch (error) {
    console.error('Error creating survey:', error); // Debugging log
    res.status(500).json({ message: 'Internal error while creating survey' });
  }
};

// Controller to get a survey by ID
export const getSurveyById = async (req, res) => {
  try {
    console.log(`Fetching survey with ID: ${req.params.id}`); // Debugging log

    const surveyId = req.params.id;
    const survey = await surveysService.getSurveyById(surveyId);

    if (!survey) {
      console.warn(`Survey not found: ID ${surveyId}`); // Debugging log
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log('Survey found:', survey); // Debugging log
    res.status(200).json(survey);
  } catch (error) {
    console.error('Error fetching survey by ID:', error); // Debugging log
    res.status(500).json({ message: 'Internal error while fetching survey' });
  }
};

// Controller to get active surveys
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('Fetching active surveys...'); // Debugging log
    const activeSurveys = await surveysService.getActiveSurveys();

    console.log(`Found ${activeSurveys.length} active surveys`); // Debugging log
    res.status(200).json(activeSurveys);
  } catch (error) {
    console.error('Error fetching active surveys:', error); // Debugging log
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
      console.log('Response is missing questionId or answer'); // Debugging log
      return res.status(400).json({ message: 'Response is missing questionId or answer' });
    }

    // Fetch the survey to get the questions
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      console.log('Survey not found'); // Debugging log
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log('Survey found:', survey); // Debugging log

    // Map the response to include the question text
    const resultEntries = response.map(item => {
      const questionObj = survey.questions.find(q => q.questionId === item.questionId);
      if (!questionObj) {
        console.log('Question not found in the survey'); // Debugging log
        throw new Error('Question not found in the survey');
      }

      console.log('Question found:', questionObj); // Debugging log

      return {
        surveyId,
        userId,
        question: questionObj.question, // Add the question text here
        answer: item.answer,            // Store the answer
      };
    });

    console.log('Result Entries:', resultEntries); // Debugging log

    // Save all the results
    const savedResponse = await Result.bulkCreate(resultEntries);

    console.log('Response successfully recorded:', savedResponse); // Debugging log

    // Log each saved response to verify the question field
    savedResponse.forEach((response, index) => {
      console.log(`Saved Response ${index + 1}:`, {
        id: response.id,
        surveyId: response.surveyId,
        userId: response.userId,
        question: response.question, // Verify the question field
        answer: response.answer,
      });
    });

    res.status(200).json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('Error recording response:', error); // Debugging log
    res.status(500).json({ message: 'Internal error while recording response' });
  }
};

// Controller to delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    console.log(`Received request to delete survey with ID: ${req.params.id}`); // Debugging log

    const surveyId = req.params.id;
    await surveysService.deleteSurvey(surveyId);

    console.log(`Survey successfully deleted: ID ${surveyId}`); // Debugging log
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error); // Debugging log
    res.status(500).json({ message: 'Internal error while deleting survey' });
  }
};
