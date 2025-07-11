import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Controller to create a new survey (admin only)
export const createSurvey = async (req, res) => {
  try {
    const surveyData = req.body;
    const survey = await surveysService.createSurvey(surveyData);
    res.status(201).json(survey);
  } catch (error) {
    res.status(500).json({ message: 'Error creating survey' });
  }
};

// Controller to get active surveys
export const getActiveSurveys = async (req, res) => {
  try {
    const activeSurveys = await surveysService.getActiveSurveys();
    res.status(200).json({ surveys: activeSurveys });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active surveys' });
  }
};

// Controller to respond to a survey by token 
export const respondToSurveyByToken = async (req, res) => {
  try {
    const accessToken = req.query.accessToken;
    const userId = req.user?.userId;

    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // ... rest of the implementation ...
    
    res.status(200).json({ message: 'Response recorded successfully' });
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
    res.status(500).json({ message: 'Error deleting survey' });
  }
};

// Controller to get a survey by access token
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const accessToken = req.query.accessToken;
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    res.status(200).json(survey);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching survey' });
  }
};

// Controller to get surveys for a specific client
export const getClientSurveys = async (req, res) => {
  try {
    if (!req.client) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const surveys = await Survey.findAll({ 
      where: { clientId: req.client.id }
    });
    
    res.status(200).json({ surveys });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching surveys' });
  }
};
