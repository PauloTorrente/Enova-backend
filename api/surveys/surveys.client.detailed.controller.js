import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { getClientSurveyStats } from './surveys.client.stats.controller.js';

// See also surveys.client.stats.controller.js for the lighter-weight
// summary-only version of this data.
export { getClientSurveyStats };

// Get client's own surveys with detailed, per-survey response counts and
// expiration status (also refreshes a survey's stored `status` if it has
// expired since it was last read).
export const getMySurveys = async (req, res) => {
  const clientId = req.client?.id;
  try {
    if (!clientId) {
      return res.status(403).json({
        message: 'Access denied - client authentication required'
      });
    }

    const surveys = await Survey.findAll({
      where: { clientId },
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'title', 'description', 'questions', 'expirationTime',
        'status', 'accessToken', 'clientId', 'responseLimit', 'createdAt'
      ],
      raw: false
    });

    const surveysWithStats = await Promise.all(surveys.map(buildSurveyStats));

    const stats = {
      total: surveysWithStats.length,
      active: surveysWithStats.filter(s => s.status === 'active').length,
      expired: surveysWithStats.filter(s => s.status === 'expired').length,
      totalResponses: surveysWithStats.reduce((sum, survey) => sum + (survey.responseCount || 0), 0)
    };

    res.status(200).json({
      success: true,
      surveys: surveysWithStats,
      total: surveysWithStats.length,
      stats
    });
  } catch (error) {
    console.error(`[surveys.client.detailed] getMySurveys failed (clientId=${clientId}):`, error.message);
    res.status(500).json({
      message: 'Failed to fetch client surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Computes response count + expiration status for one survey, refreshing
// its stored status if it has expired since last read. Falls back to a
// bare-bones record (with error: true) if stats can't be computed, so one
// broken survey doesn't fail the whole list.
const buildSurveyStats = async (survey) => {
  try {
    const responseCount = await Result.count({ where: { surveyId: survey.id } });

    const now = new Date();
    const expirationTime = new Date(survey.expirationTime);
    const status = now > expirationTime ? 'expired' : 'active';

    if (survey.status !== status) {
      await Survey.update({ status }, { where: { id: survey.id } });
    }

    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status,
      accessToken: survey.accessToken,
      expirationTime: survey.expirationTime,
      responseLimit: survey.responseLimit,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      responseCount,
      clientId: survey.clientId,
      isExpired: now > expirationTime,
      daysUntilExpiration: Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24)),
      responsePercentage: survey.responseLimit
        ? Math.min(100, Math.round((responseCount / survey.responseLimit) * 100))
        : null
    };
  } catch (error) {
    console.error(`[surveys.client.detailed] Failed to compute stats for survey ${survey.id}:`, error.message);
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      accessToken: survey.accessToken,
      expirationTime: survey.expirationTime,
      responseLimit: survey.responseLimit,
      responseCount: 0,
      clientId: survey.clientId,
      error: 'Error loading statistics'
    };
  }
};

export default {
  getMySurveys,
  getClientSurveyStats
};
