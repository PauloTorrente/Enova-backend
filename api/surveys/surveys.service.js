import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Function to generate a unique token for a survey
export const generateSurveyToken = () => {
  // Generate 20 random bytes and convert to a hexadecimal string
  return crypto.randomBytes(20).toString('hex');
};

// Function to create a new survey
export const createSurvey = async (surveyData) => {
  try {
    // Generate a unique token and assign it to the accessToken field
    surveyData.accessToken = generateSurveyToken();

    // Create the survey in the database using the provided data (including the token)
    const survey = await Survey.create(surveyData);
    return survey;
  } catch (error) {
    // Throw an error if something goes wrong during survey creation
    throw new Error('Error creating survey: ' + error.message);
  }
};

// Function to get active surveys
export const getActiveSurveys = async () => {
  try {
    console.log('Fetching active surveys from database...'); 
    const surveys = await Survey.findAll({
      where: {
        status: 'active',
        expirationTime: {
          [Op.gt]: new Date(),
        },
      },
    });
    console.log('Active surveys found:', surveys);
    return surveys;
  } catch (error) {
    console.error('Error fetching active surveys:', error); 
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Function to get a survey by access token
export const getSurveyByAccessToken = async (accessToken) => {
  try {
    const survey = await Survey.findOne({
      where: {
        accessToken: accessToken, // Filter by accessToken
      },
    });

    if (!survey) {
      return null; // Return null if survey is not found
    }

    return survey; // Return the found survey
  } catch (error) {
    throw new Error('Error fetching survey by access token: ' + error.message);
  }
};

// Function to save the user's response to a survey
export const saveResponse = async (surveyId, userId, response) => {
  try {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check that response contains valid question-answer pairs
    if (!Array.isArray(response) || response.some(item => !item.questionId || !item.answer)) {
      throw new Error('Response contains invalid data (questionId or answer missing)');
    }

    // Iterate over the response and save each question-answer pair separately
    const resultEntries = response.map(item => {
      return {
        surveyId,
        userId,
        question: item.question,  // Add the question text here
        answer: item.answer,      // Store the answer (could be an object for multiple choice)
      };
    });

    // Save all the results
    const results = await Result.bulkCreate(resultEntries);
    return results;
  } catch (error) {
    throw new Error('Error saving response: ' + error.message);
  }
};

// Function to delete a survey
export const deleteSurvey = async (surveyId) => {
  try {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    await survey.destroy();
  } catch (error) {
    throw new Error('Error deleting survey: ' + error.message);
  }
};

// Export all service functions
const surveysService = {
  createSurvey,
  getActiveSurveys,
  getSurveyByAccessToken,
  saveResponse,
  deleteSurvey,
};

export default surveysService;
