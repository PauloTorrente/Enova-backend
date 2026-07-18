import * as resultsService from './results.service.js';
import { verifyClientAccessWithPrivileges } from './results.access.service.js';

// Returns responses joined with respondent demographics, formatted for
// the client dashboard's per-respondent view.
export const getSurveyResponsesWithUserDetails = async (req, res) => {
  const { surveyId } = req.params;

  try {
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);

    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    if (!responses || responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    const uniqueUserIds = [...new Set(responses.map((r) => r.userId))];
    const totalUsers = uniqueUserIds.length;
    const totalResponses = responses.length;

    const formatted = responses.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      user: r.user
        ? {
            id: r.user.id,
            name: `${r.user.firstName} ${r.user.lastName}`,
            email: r.user.email,
            city: r.user.city,
            area: r.user.residentialArea,
            gender: r.user.gender,
            age: r.user.age
          }
        : null
    }));

    res.status(200).json({
      message: 'Responses with user details fetched successfully!',
      responses: formatted,
      metadata: {
        totalResponses,
        totalUsers,
        responsesPerUser: totalUsers > 0 ? (totalResponses / totalUsers).toFixed(1) : 0,
        surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role,
        hasAdminPrivileges: req.client?.role === 'client_admin'
      }
    });
  } catch (error) {
    console.error(`[results.client.detailed] getSurveyResponsesWithUserDetails failed (surveyId=${surveyId}, clientId=${req.client?.id}):`, error.message);
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({
      message: error.message,
      error: error.message,
      debug: process.env.NODE_ENV === 'development'
        ? { surveyId, clientId: req.client?.id, clientRole: req.client?.role, errorName: error.name }
        : undefined
    });
  }
};
