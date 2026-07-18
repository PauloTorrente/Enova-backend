import * as resultsService from './results.service.js';
import { verifyClientAccessWithPrivileges } from './results.access.service.js';

// Same shape as results.client.detailed.controller.js, but adds each
// respondent's loyalty score and an aggregate average — used by the
// "results with scores" dashboard view.
export const getSurveyResultsWithScores = async (req, res) => {
  const { surveyId } = req.params;

  try {
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);

    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    if (!responses || responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    const formatted = responses.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      user: r.user
        ? {
            id: r.user.id,
            name: `${r.user.firstName} ${r.user.lastName}`,
            email: r.user.email,
            score: r.user.score || 0,
            city: r.user.city,
            area: r.user.residentialArea,
            gender: r.user.gender,
            age: r.user.age
          }
        : null
    }));

    const uniqueUserIds = [...new Set(responses.map((r) => r.userId))];
    const totalUsers = uniqueUserIds.length;
    const totalResponses = responses.length;

    const uniqueUsers = [...new Map(
      responses.filter((r) => r.user && r.user.score !== undefined).map((r) => [r.user.id, r.user])
    ).values()];
    const averageScore = uniqueUsers.length > 0
      ? uniqueUsers.reduce((sum, u) => sum + (u.score || 0), 0) / uniqueUsers.length
      : 0;

    res.status(200).json({
      message: 'Responses with user scores fetched successfully!',
      responses: formatted,
      statistics: {
        totalResponses,
        totalUsers,
        averageScore: parseFloat(averageScore.toFixed(2)),
        usersWithScores: uniqueUsers.length
      },
      metadata: {
        surveyId,
        clientId: req.client?.id,
        clientRole: req.client?.role,
        hasAdminPrivileges: req.client?.role === 'client_admin'
      }
    });
  } catch (error) {
    console.error(`[results.client.scores] getSurveyResultsWithScores failed (surveyId=${surveyId}, clientId=${req.client?.id}):`, error.message);
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
