import Survey from './surveys.model.js';
import { log, DIAGNOSTIC_MODE } from './surveys.debug.log.util.js';
import { debugSurveyDetails } from './surveys.client.details-debug.controller.js';
import { healthCheckClientSurveys } from './surveys.client.health.controller.js';

// Diagnostic endpoints for troubleshooting client survey access issues.
// Split across:
//   - surveys.debug.log.util.js                   -> shared dev/prod-aware logger
//   - surveys.client.details-debug.controller.js  -> debugSurveyDetails
//   - surveys.client.health.controller.js          -> healthCheckClientSurveys
export { debugSurveyDetails, healthCheckClientSurveys };

// Quick sanity check: does this client have surveys, and what do a
// handful of them look like?
export const debugMySurveys = async (req, res) => {
  log('🔍', 'Debug endpoint: Client surveys check');

  try {
    const clientId = req.client?.id;
    if (!clientId) {
      log('❌', 'No client ID found in request');
      return res.status(403).json({
        success: false,
        message: 'Authentication required',
        debug: DIAGNOSTIC_MODE ? { clientInRequest: req.client, userInRequest: req.user } : undefined
      });
    }

    const surveyCount = await Survey.count({ where: { clientId } });
    const surveys = await Survey.findAll({
      where: { clientId },
      order: [['created_at', 'DESC']],
      raw: true,
      limit: 5
    });

    const sampleSurvey = surveys.length > 0 ? surveys[0] : null;

    res.json({
      success: true,
      clientId,
      surveyCount,
      surveysSample: surveys.map(survey => ({
        id: survey.id,
        title: survey.title,
        status: survey.status,
        questionsCount: survey.questions ? (Array.isArray(survey.questions) ? survey.questions.length : 'N/A') : 0,
        createdAt: survey.created_at
      })),
      diagnostics: DIAGNOSTIC_MODE ? {
        databaseInfo: {
          totalSurveysInDatabase: await Survey.count(),
          sampleSurveyFields: sampleSurvey ? Object.keys(sampleSurvey).length : 'No surveys'
        },
        authentication: {
          clientId: req.client?.id,
          clientEmail: req.client?.email
        }
      } : undefined
    });
  } catch (error) {
    log('❌', 'Debug endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: DIAGNOSTIC_MODE ? error.message : undefined
    });
  }
};

export default {
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys
};
