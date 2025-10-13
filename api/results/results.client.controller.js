import * as resultsService from './results.service.js';
import Survey from '../surveys/surveys.model.js';
import { verifyClientAccess } from './results.access.service.js';
import { processSurveyAnalytics } from './results.analytics.core.service.js'; 

// Get all responses for a survey
export const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID required' });
    }
    
    await verifyClientAccess(surveyId, req.client?.id);
    const responses = await resultsService.getResponsesBySurvey(surveyId);
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    return res.status(200).json({
      message: 'Responses fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      message: error.message,
      error: error.message,
    });
  }
};

// Get responses for specific question
export const getResponsesByQuestion = async (req, res) => {
  try {
    const { surveyId, question } = req.params;
    
    await verifyClientAccess(surveyId, req.client?.id);
    const responses = await resultsService.getResponsesByQuestion(surveyId, question);
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this question.' });
    }

    return res.status(200).json({
      message: 'Responses for the question fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      message: error.message,
      error: error.message,
    });
  }
};

// Get responses with user details
export const getSurveyResponsesWithUserDetails = async (req, res) => {
  const { surveyId } = req.params;
  
  try {
    await verifyClientAccess(surveyId, req.client?.id);
    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    
    if (!responses || responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    const formatted = responses.map(r => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      user: r.user ? {
        id: r.user.id,
        name: `${r.user.firstName} ${r.user.lastName}`,
        email: r.user.email,
        city: r.user.city,
        area: r.user.residentialArea,
        gender: r.user.gender,
        age: r.user.age
      } : null
    }));

    res.status(200).json({
      message: 'Responses with user details fetched successfully!',
      responses: formatted
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({ 
      message: error.message,
      error: error.message
    });
  }
};

// Get detailed analytics with demographic segmentation
export const getSurveyAnalytics = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const clientId = req.client?.id;
    
    console.log(`📊 Getting analytics for survey ${surveyId}, client ${clientId}`);
    
    if (!clientId) {
      console.error('❌ Client ID missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if survey belongs to client
    const survey = await Survey.findOne({ 
      where: { id: surveyId, clientId }
    });
    
    if (!survey) {
      console.error(`❌ Survey ${surveyId} not found or access denied`);
      return res.status(404).json({ message: 'Survey not found or access denied' });
    }

    console.log(`✅ Survey found: ${survey.title}`);
    
    // Process analytics using the analytics service
    const analyticsData = await processSurveyAnalytics(survey);
    
    res.status(200).json(analyticsData);

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch survey analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
