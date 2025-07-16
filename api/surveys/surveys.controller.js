import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import User from '../users/users.model.js';

// Create survey (admin or client)
export const createSurvey = async (req, res) => {
  try {
    const surveyData = req.body;
    
    // Auto-assign client ID if request comes from client
    if (req.client?.id) {
      surveyData.clientId = req.client.id;
    }
    // Admin can optionally specify clientId in request body
    else if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const survey = await surveysService.createSurvey(surveyData);
    res.status(201).json(survey);
  } catch (error) {
    console.error('Create survey error:', error);
    res.status(500).json({ message: 'Failed to create survey' });
  }
};

// Get active surveys (public)
export const getActiveSurveys = async (req, res) => {
  try {
    const surveys = await surveysService.getActiveSurveys();
    res.status(200).json({ surveys });
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Submit survey responses
export const respondToSurveyByToken = async (req, res) => {
  try {
    const { accessToken } = req.query;
    if (!accessToken) return res.status(400).json({ message: 'Token required' });

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    await surveysService.saveResponse(survey.id, req.user?.userId, req.body);
    res.status(200).json({ message: 'Responses saved' });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    await surveysService.deleteSurvey(req.params.id);
    res.status(200).json({ message: 'Survey deleted' });
  } catch (error) {
    console.error('Delete survey error:', error);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey by token (public)
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const { accessToken } = req.query;
    if (!accessToken) return res.status(400).json({ message: 'Token required' });

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    res.status(200).json(survey);
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};

// Get client's surveys with response counts
export const getClientSurveys = async (req, res) => {
  try {
    if (!req.client?.id) return res.status(403).json({ message: 'Access denied' });

    const surveys = await Survey.findAll({ 
      where: { clientId: req.client.id }
    });
    
    const surveysWithStats = await Promise.all(
      surveys.map(async s => ({
        ...s.toJSON(),
        responseCount: await Result.count({ where: { surveyId: s.id } })
      }))
    );
    
    res.status(200).json({ surveys: surveysWithStats });
  } catch (error) {
    console.error('Get client surveys error:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Get survey results (owner only)
export const getSurveyResults = async (req, res) => {
  try {
    const surveyId = req.params.id;
    if (!req.client?.id) return res.status(403).json({ message: 'Access denied' });

    const survey = await Survey.findOne({ 
      where: { id: surveyId, clientId: req.client.id }
    });
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const results = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User,
        attributes: ['firstName', 'lastName', 'age', 'city']
      }]
    });

    res.status(200).json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
};
