import * as resultsService from './results.service.js';
import Survey from '../surveys/surveys.model.js';

// Verify client access to a survey
const verifyClientAccess = async (surveyId, clientId) => {
  const survey = await Survey.findByPk(surveyId);
  if (!survey) throw new Error('Survey not found');
  if (survey.clientId !== clientId) throw new Error('Access denied to this survey');
  return survey;
};

// Get all responses for a survey with client access check
export const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    if (!surveyId) return res.status(400).json({ message: 'Survey ID required' });
    
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

// Get responses for a specific question with client access check
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

// Get detailed responses with user info and client access check
export const getSurveyResponsesWithUserDetails = async (req, res) => {
  const { surveyId } = req.params;
  
  try {
    await verifyClientAccess(surveyId, req.client?.id);
    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    
    if (!responses || responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    // Format response data
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
