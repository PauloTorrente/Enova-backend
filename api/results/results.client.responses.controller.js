import * as resultsService from './results.service.js';
import { verifyClientAccessWithPrivileges } from './results.access.service.js';

// Basic response-listing endpoints for the client dashboard. Both enforce
// the same access rule: client_admin can read any survey, a normal client
// only its own (see results.access.service.js).

// Lists every raw response submitted to a survey.
export const getResponsesBySurvey = async (req, res) => {
  const { surveyId } = req.params;
  try {
    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID required' });
    }

    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    const responses = await resultsService.getResponsesBySurvey(surveyId);

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    return res.status(200).json({
      message: 'Responses fetched successfully!',
      responses,
      metadata: { clientRole: req.client?.role, hasAdminPrivileges: req.client?.role === 'client_admin' }
    });
  } catch (error) {
    console.error(`[results.client.responses] getResponsesBySurvey failed (surveyId=${surveyId}, clientId=${req.client?.id}):`, error.message);
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({ message: error.message, error: error.message, clientRole: req.client?.role });
  }
};

// Lists every response to one specific question within a survey.
export const getResponsesByQuestion = async (req, res) => {
  const { surveyId, question } = req.params;
  try {
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);
    const responses = await resultsService.getResponsesByQuestion(surveyId, question);

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this question.' });
    }

    return res.status(200).json({
      message: 'Responses for the question fetched successfully!',
      responses,
      metadata: { clientRole: req.client?.role, hasAdminPrivileges: req.client?.role === 'client_admin' }
    });
  } catch (error) {
    console.error(`[results.client.responses] getResponsesByQuestion failed (surveyId=${surveyId}, clientId=${req.client?.id}):`, error.message);
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({ message: error.message, error: error.message, clientRole: req.client?.role });
  }
};
