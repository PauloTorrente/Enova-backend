import Survey from './surveys.model.js';
import { log, DIAGNOSTIC_MODE } from './surveys.debug.log.util.js';

// Lightweight health check for a client's survey access: confirms the DB
// is reachable and returns a handful of recent surveys as a sanity check.
export const healthCheckClientSurveys = async (req, res) => {
  log('🩺', 'Client surveys health check');

  try {
    const clientId = req.client?.id;
    if (!clientId) {
      return res.status(403).json({ success: false, message: 'Client authentication required' });
    }

    const healthChecks = { databaseConnection: 'OK', surveyCount: 0, recentSurveys: [], issues: [] };

    try {
      healthChecks.surveyCount = await Survey.count({ where: { clientId } });
    } catch (error) {
      healthChecks.databaseConnection = 'FAILED';
      healthChecks.issues.push('Database connection failed');
      log('❌', 'Database connection failed:', error.message);
    }

    if (healthChecks.databaseConnection === 'OK') {
      try {
        const recentSurveys = await Survey.findAll({
          where: { clientId },
          order: [['created_at', 'DESC']],
          limit: 3,
          attributes: ['id', 'title', 'status', 'created_at']
        });

        healthChecks.recentSurveys = recentSurveys.map(survey => ({
          id: survey.id,
          title: survey.title,
          status: survey.status,
          createdAt: survey.created_at
        }));
      } catch (error) {
        healthChecks.issues.push('Failed to fetch recent surveys');
        log('⚠️', 'Failed to fetch recent surveys:', error.message);
      }
    }

    const allOk = healthChecks.databaseConnection === 'OK' && healthChecks.issues.length === 0;

    res.json({
      success: true,
      clientId,
      status: allOk ? 'healthy' : 'issues_detected',
      healthChecks: {
        database: healthChecks.databaseConnection,
        surveyCount: healthChecks.surveyCount,
        recentSurveysCount: healthChecks.recentSurveys.length,
        issuesCount: healthChecks.issues.length
      },
      details: DIAGNOSTIC_MODE ? {
        recentSurveys: healthChecks.recentSurveys,
        issues: healthChecks.issues
      } : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log('❌', 'Health check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: DIAGNOSTIC_MODE ? error.message : undefined
    });
  }
};
