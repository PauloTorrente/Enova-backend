import Survey from '../surveys/surveys.model.js';
import { processSurveyAnalytics } from './results.analytics.core.service.js';

// Returns full demographic-segmented analytics for a survey. Access rule
// mirrors verifyClientAccessWithPrivileges, but inlined here because it
// also needs the loaded `survey` record to hand to processSurveyAnalytics
// (a second lookup would be wasted work).
export const getSurveyAnalytics = async (req, res) => {
  const { surveyId } = req.params;
  const clientId = req.client?.id;
  const clientRole = req.client?.role;

  try {
    if (!clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const survey = clientRole === 'client_admin'
      ? await Survey.findByPk(surveyId)
      : await Survey.findOne({ where: { id: surveyId, clientId } });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found or access denied' });
    }

    const analyticsData = await processSurveyAnalytics(survey);
    analyticsData.accessInfo = {
      accessedByClientId: clientId,
      accessedByRole: clientRole,
      isAdminAccess: clientRole === 'client_admin',
      surveyOwnerClientId: survey.clientId
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error(`[results.client.analytics] getSurveyAnalytics failed (surveyId=${surveyId}, clientId=${clientId}):`, error.message);
    res.status(500).json({
      message: 'Failed to fetch survey analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development'
        ? { errorName: error.name, surveyId, clientId, clientRole }
        : undefined
    });
  }
};
