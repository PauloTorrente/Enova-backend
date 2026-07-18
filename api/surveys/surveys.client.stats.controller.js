import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Summary statistics (active/expired counts, total responses) across all
// of one client's surveys — lighter-weight than getMySurveys, which
// returns the full per-survey list.
export const getClientSurveyStats = async (req, res) => {
  const clientId = req.client?.id;
  try {
    if (!clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const surveys = await Survey.findAll({
      where: { clientId },
      attributes: ['id', 'title', 'status', 'expirationTime', 'responseLimit']
    });

    const stats = await Promise.all(
      surveys.map(async (survey) => {
        const responseCount = await Result.count({ where: { surveyId: survey.id } });
        return {
          surveyId: survey.id,
          surveyTitle: survey.title,
          status: survey.status,
          responseCount,
          responseLimit: survey.responseLimit,
          responsePercentage: survey.responseLimit
            ? Math.min(100, Math.round((responseCount / survey.responseLimit) * 100))
            : null,
          isExpired: new Date() > new Date(survey.expirationTime)
        };
      })
    );

    const summary = {
      totalSurveys: stats.length,
      activeSurveys: stats.filter((s) => s.status === 'active').length,
      expiredSurveys: stats.filter((s) => s.isExpired).length,
      totalResponses: stats.reduce((sum, s) => sum + s.responseCount, 0),
      surveys: stats
    };

    res.status(200).json({ success: true, summary, clientId });
  } catch (error) {
    console.error(`[surveys.client.stats] getClientSurveyStats failed (clientId=${clientId}):`, error.message);
    res.status(500).json({
      message: 'Failed to fetch client statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
