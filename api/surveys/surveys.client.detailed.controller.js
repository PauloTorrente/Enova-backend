import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Get client's own surveys with detailed response counts - UPDATED VERSION WITH FIELD MAPPING FIX
export const getMySurveys = async (req, res) => {
  console.log('[SURVEYS] Starting client surveys fetch...');
  
  try {
    const clientId = req.client?.id;
    
    // Validate client authentication
    if (!clientId) {
      console.error('[SURVEYS] Client ID missing - access denied');
      return res.status(403).json({ 
        message: 'Access denied - client authentication required'
      });
    }

    console.log(`[SURVEYS] Fetching surveys for client ID: ${clientId}`);
    
    // Execute query with proper field mapping
    const surveys = await Survey.findAll({ 
      where: { clientId },
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 
        'title', 
        'description', 
        'questions', 
        'expirationTime', 
        'status', 
        'accessToken', 
        'clientId',
        'responseLimit',
        'createdAt'
      ],
      raw: false
    });
    
    console.log(`[SURVEYS] Found ${surveys.length} surveys for client`);
    
    // Process statistics for each survey
    const surveysWithStats = await Promise.all(
      surveys.map(async (survey) => {
        try {
          // Count total responses for this survey
          const responseCount = await Result.count({ 
            where: { surveyId: survey.id }
          });
          
          // Check survey status based on expiration date
          const now = new Date();
          const expirationTime = new Date(survey.expirationTime);
          const status = now > expirationTime ? 'expired' : 'active';
          
          // Update survey status in database if it has changed
          if (survey.status !== status) {
            await Survey.update({ status }, { where: { id: survey.id } });
          }

          // Compile comprehensive survey data
          const surveyData = {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            status: status,
            accessToken: survey.accessToken,
            expirationTime: survey.expirationTime,
            responseLimit: survey.responseLimit,
            createdAt: survey.createdAt,
            updatedAt: survey.updatedAt,
            responseCount: responseCount,
            clientId: survey.clientId,
            isExpired: now > expirationTime,
            daysUntilExpiration: Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24)),
            responsePercentage: survey.responseLimit ? 
              Math.min(100, Math.round((responseCount / survey.responseLimit) * 100)) : null
          };
          
          return surveyData;

        } catch (surveyError) {
          console.error(`[SURVEYS] Error processing survey ${survey.id}:`, surveyError.message);
          
          // Return basic survey data in case of error
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
      })
    );

    console.log(`[SURVEYS] Successfully processed ${surveysWithStats.length} surveys`);
    
    // Calculate final statistics summary
    const stats = {
      total: surveysWithStats.length,
      active: surveysWithStats.filter(s => s.status === 'active').length,
      expired: surveysWithStats.filter(s => s.status === 'expired').length,
      totalResponses: surveysWithStats.reduce((sum, survey) => sum + (survey.responseCount || 0), 0)
    };
    
    console.log(`[SURVEYS] Statistics: ${stats.active} active, ${stats.expired} expired, ${stats.totalResponses} total responses`);
    
    // Return successful response
    res.status(200).json({
      success: true,
      surveys: surveysWithStats,
      total: surveysWithStats.length,
      stats: stats
    });

  } catch (error) {
    console.error('[SURVEYS] General error:', error.message);
    
    // Return error response
    res.status(500).json({ 
      message: 'Failed to fetch client surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get client survey statistics summary
export const getClientSurveyStats = async (req, res) => {
  try {
    const clientId = req.client?.id;
    
    if (!clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`[STATS] Fetching statistics for client ID: ${clientId}`);

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
          responsePercentage: survey.responseLimit ? 
            Math.min(100, Math.round((responseCount / survey.responseLimit) * 100)) : null,
          isExpired: new Date() > new Date(survey.expirationTime)
        };
      })
    );

    const summary = {
      totalSurveys: stats.length,
      activeSurveys: stats.filter(s => s.status === 'active').length,
      expiredSurveys: stats.filter(s => s.isExpired).length,
      totalResponses: stats.reduce((sum, s) => sum + s.responseCount, 0),
      surveys: stats
    };

    console.log(`[STATS] Statistics summary: ${summary.totalSurveys} total surveys, ${summary.activeSurveys} active, ${summary.totalResponses} responses`);

    res.status(200).json({
      success: true,
      summary,
      clientId
    });

  } catch (error) {
    console.error('[STATS] Error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch client statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export detailed client controller functions
export default {
  getMySurveys,
  getClientSurveyStats
};
