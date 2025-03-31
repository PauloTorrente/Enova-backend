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

// Controller to get active surveys
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('Fetching active surveys...'); // Debugging log
    const activeSurveys = await surveysService.getActiveSurveys();

    console.log(`Found ${activeSurveys.length} active surveys`); // Debugging log
    res.status(200).json({ surveys: activeSurveys }); // Encapsula o array em um objeto
  } catch (error) {
    console.error('Error fetching active surveys:', error); // Debugging log
    res.status(500).json({ message: 'Internal error while fetching active surveys' });
  }
};

// Controller to respond to a survey by token 
export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('Received response for survey by token:', req.body);

    const accessToken = req.query.accessToken;
    const userId = req.user?.userId;

    if (!accessToken) {
      console.error('Access token is missing'); // Debugging log
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Fetch the survey using the accessToken
    const survey = await surveysService.getSurveyByAccessToken(accessToken);

    if (!survey) {
      console.error('Survey not found for the provided access token'); // Debugging log
      return res.status(404).json({ message: 'Survey not found' });
    }

    const response = req.body;
    if (!Array.isArray(response)) {
      return res.status(400).json({ message: 'Response should be an array' });
    }

    // Parse questions if they are stored as string
    let questions = typeof survey.questions === 'string' 
      ? JSON.parse(survey.questions) 
      : survey.questions;

    // Normalize question IDs for comparison
    questions = questions.map((q, index) => ({
      ...q,
      questionId: q.questionId || q.id || index + 1
    }));

    console.log('Survey questions with normalized IDs:', questions);

    const resultEntries = response.map(item => {
      // Find question by ID (try both questionId and id fields)
      const questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      if (!questionObj) {
        console.error('Question not found:', {
          receivedQuestionId: item.questionId,
          availableQuestions: questions.map(q => q.questionId)
        });
        throw new Error(`Question with ID ${item.questionId} not found in survey`);
      }

      console.log('Question found:', questionObj); // Debugging log

      return {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionObj.question || questionObj.text,
        answer: item.answer,
      };
    });

    console.log('Result Entries:', resultEntries); // Debugging log

    // Save all the results
    const savedResponse = await Result.bulkCreate(resultEntries);
    return res.status(200).json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response',
      details: error.details || null
    });
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

// Controller to get a survey by access token
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const accessToken = req.query.accessToken; // Get the accessToken from the query

    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Fetch the survey using the accessToken
    const survey = await surveysService.getSurveyByAccessToken(accessToken);

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error('Error fetching survey by access token:', error);
    res.status(500).json({ message: 'Internal error while fetching survey' });
  }
};
