import * as surveysService from './surveys.service.js';
import crypto from 'crypto';

// Generates the respondent-facing access token. Generated here (rather
// than left to the service's own fallback) so the controller can echo it
// straight back in the response without a second DB read.
const generateSurveyToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Create a new survey (accessible to both admin and clients)
export const createSurvey = async (req, res) => {
  try {
    const surveyData = req.body;

    // Auto-assign client ID if request comes from authenticated client
    if (req.client?.id) {
      surveyData.clientId = req.client.id;
    }
    // Admin users can optionally specify clientId in request body
    else if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!surveyData.title || !surveyData.questions || !Array.isArray(surveyData.questions)) {
      return res.status(400).json({
        message: 'Title and questions array are required'
      });
    }

    const accessToken = generateSurveyToken();
    surveyData.accessToken = accessToken;

    const survey = await surveysService.createSurvey(surveyData);

    // accessToken is echoed from the value we generated above (not
    // survey.accessToken) as a safety net in case the DB round-trip ever
    // strips it — the caller needs this token immediately to use the survey.
    const surveyResponse = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
      accessToken,
      expirationTime: survey.expirationTime,
      status: survey.status,
      responseLimit: survey.responseLimit,
      clientId: survey.clientId,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt
    };

    res.status(201).json(surveyResponse);
  } catch (error) {
    console.error(`[surveys.creation] createSurvey failed:`, error.message);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    const statusCode = error.message.includes('validation') ? 400 : 500;
    res.status(statusCode).json({
      message: 'Failed to create survey',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all active surveys (public endpoint)
export const getActiveSurveys = async (req, res) => {
  try {
    const surveys = await surveysService.getActiveSurveys();
    res.status(200).json({ surveys });
  } catch (error) {
    console.error(`[surveys.creation] getActiveSurveys failed:`, error.message);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Export creation controller functions
export default {
  createSurvey,
  getActiveSurveys
};
