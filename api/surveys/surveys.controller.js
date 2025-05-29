import * as surveysService from './surveys.service.js'; // Import all functions from the service module
import Survey from './surveys.model.js'; // Importing the Survey model
import Result from '../results/results.model.js'; // Importing the Result model

// Controller to create a new survey (admin only)
export const createSurvey = async (req, res) => {
  try {
    console.log('[Survey] Create request received'); // Debugging log

    const surveyData = req.body; // Survey data sent from the client
    const survey = await surveysService.createSurvey(surveyData);

    console.log('✅ Survey created successfully'); // Debugging log
    // The response includes the created survey with the access token
    res.status(201).json(survey);
  } catch (error) {
    console.error('❌ Survey creation error:', error.message); // Debugging log
    res.status(500).json({ message: 'Internal error while creating survey' });
  }
};

// Controller to get active surveys
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('[Survey] Fetching active surveys...'); // Debugging log
    const activeSurveys = await surveysService.getActiveSurveys();

    console.log(`✅ Found ${activeSurveys.length} active surveys`); // Debugging log
    res.status(200).json({ surveys: activeSurveys }); // Encapsulates the array in an object
  } catch (error) {
    console.error('❌ Error fetching active surveys:', error.message); // Debugging log
    res.status(500).json({ message: 'Internal error while fetching active surveys' });
  }
};

// Controller to respond to a survey by token 
export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('[Survey] Response received'); // Debugging log

    const accessToken = req.query.accessToken; // Get access token from query params
    const userId = req.user?.userId; // Get user ID from authenticated user

    if (!accessToken) {
      console.error('❌ Access token missing');
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Fetch the survey using the accessToken
    const survey = await surveysService.getSurveyByAccessToken(accessToken);

    if (!survey) {
      console.error('❌ Survey not found');
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Check if user has already responded to this survey
    const existingResponse = await Result.findOne({
      where: {
        surveyId: survey.id,
        userId
      }
    });

    if (existingResponse) {
      console.log(`⚠️ User ${userId} attempted duplicate response to survey ${survey.id}`);
      return res.status(400).json({ 
        message: 'You have already responded to this survey.' 
      });
    }

    const response = req.body; // Get response data from request body
    if (!Array.isArray(response)) {
      console.error('❌ Invalid response format');
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

    // Define answer length requirements
    const answerLengthRequirements = {
      short: { min: 1, max: 100 },    // Minimum 1 character, maximum 100
      medium: { min: 10, max: 300 },   // Minimum 10 characters, maximum 300
      long: { min: 50, max: 1000 },    // Minimum 50 characters, maximum 1000
      unrestricted: { min: 0, max: Infinity } // No restrictions
    };

    const resultEntries = response.map(item => {
      // Find question by ID (try both questionId and id fields)
      const questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      if (!questionObj) {
        console.error('❌ Question not found:', item.questionId);
        throw new Error(`Question with ID ${item.questionId} not found in survey`);
      }

      // Validate answer length if specified for text questions
      if (questionObj.answerLength && questionObj.type === 'text') {
        const answer = item.answer || '';
        const lengthConfig = answerLengthRequirements[questionObj.answerLength] || 
                           { min: 0, max: Infinity };

        // Validate minimum length
        if (answer.length < lengthConfig.min) {
          throw new Error(
            `Answer too short for question ${item.questionId}. ` +
            `Minimum required: ${lengthConfig.min} characters`
          );
        }

        // Validate maximum length
        if (answer.length > lengthConfig.max) {
          throw new Error(
            `Answer too long for question ${item.questionId}. ` +
            `Maximum allowed: ${lengthConfig.max} characters`
          );
        }
      }

      return {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionObj.question || questionObj.text,
        answer: item.answer,
      };
    });

    // Save all the results
    await Result.bulkCreate(resultEntries);
    console.log('✅ Survey response recorded');
    return res.status(200).json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('❌ Response recording error:', error.message);
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response',
      details: error.details || null
    });
  }
};

// Controller to delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    console.log(`[Survey] Delete request for ID: ${req.params.id}`);
    const surveyId = req.params.id;
    await surveysService.deleteSurvey(surveyId);
    console.log('✅ Survey deleted successfully');
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('❌ Survey deletion error:', error.message);
    res.status(500).json({ message: 'Internal error while deleting survey' });
  }
};

// Controller to get a survey by access token
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const accessToken = req.query.accessToken; // Get the accessToken from the query

    if (!accessToken) {
      console.error('❌ Access token required');
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Fetch the survey using the accessToken
    const survey = await surveysService.getSurveyByAccessToken(accessToken);

    if (!survey) {
      console.error('❌ Survey not found');
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log('✅ Survey retrieved by token');
    res.status(200).json(survey);
  } catch (error) {
    console.error('❌ Survey fetch error:', error.message);
    res.status(500).json({ message: 'Internal error while fetching survey' });
  }
};
