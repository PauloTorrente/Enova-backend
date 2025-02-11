import Survey from './surveys.model.js';
import { Op } from 'sequelize';
import crypto from 'crypto'; // For generating unique tokens

// Function to save a new survey
export const createSurvey = async (surveyData) => {
  try {
    const survey = await Survey.create(surveyData); // Insert new survey into the database
    return survey;
  } catch (error) {
    throw new Error('Error creating survey: ' + error.message);
  }
};

// Function to get active surveys
export const getActiveSurveys = async () => {
  try {
    const surveys = await Survey.findAll({
      where: {
        status: 'active',
        expirationTime: {
          [Op.gt]: new Date(), // Only active surveys, where expiration time is in the future
        },
      },
    });
    return surveys;
  } catch (error) {
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Function to check if a survey is expired and update its status
export const checkSurveyExpiration = async () => {
  try {
    const surveys = await Survey.findAll({
      where: {
        expirationTime: {
          [Op.lt]: new Date(), // Check if the expiration time is in the past
        },
        status: 'active',
      },
    });

    for (let survey of surveys) {
      survey.status = 'expired'; // Mark expired surveys
      await survey.save();
    }
  } catch (error) {
    throw new Error('Error checking survey expiration: ' + error.message);
  }
};

// Function to generate a unique token for a survey (for access via Vercel or similar)
export const generateSurveyToken = (surveyId) => {
  return crypto.randomBytes(20).toString('hex'); // Generate random token
};

// Function to save user responses to the survey
export const saveResponse = async (surveyId, response) => {
  try {
    // Assuming there is a Result model for saving responses
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    // Save the response (details of the response saving can vary)
    const result = await survey.createResult({ ...response });
    return result;
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
    await survey.destroy(); // Delete the survey
  } catch (error) {
    throw new Error('Error deleting survey: ' + error.message);
  }
};

const surveysService = {
  createSurvey,
  getActiveSurveys,
  checkSurveyExpiration,
  generateSurveyToken,
  saveResponse,
  deleteSurvey
};

export default surveysService;