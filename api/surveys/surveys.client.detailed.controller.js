import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Get client's own surveys with detailed response counts - UPDATED VERSION WITH FIELD MAPPING FIX
export const getMySurveys = async (req, res) => {
  console.log('=== 🔍 [GET_MY_SURVEYS] STARTING DEBUG PROCESS ===');
  
  try {
    // Debug authentication information
    console.log('🔐 [GET_MY_SURVEYS] Authentication Debug:', {
      clientObject: req.client,
      clientId: req.client?.id,
      clientEmail: req.client?.email,
      clientCompany: req.client?.companyName,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        'content-type': req.headers['content-type']
      }
    });

    const clientId = req.client?.id;
    console.log(`🔍 [GET_MY_SURVEYS] Extracted Client ID: ${clientId}`);
    
    // Validate client authentication
    if (!clientId) {
      console.error('❌ [GET_MY_SURVEYS] Client ID Missing - Access Denied');
      console.error('❌ [GET_MY_SURVEYS] Full Request Object:', {
        client: req.client,
        user: req.user,
        headers: req.headers
      });
      return res.status(403).json({ 
        message: 'Access denied - client authentication required',
        debug: process.env.NODE_ENV === 'development' ? {
          clientInRequest: req.client,
          userInRequest: req.user
        } : undefined
      });
    }

    console.log(`🔍 [GET_MY_SURVEYS] Searching for Surveys with Client ID: ${clientId}`);
    
    // Test database connection first
    try {
      console.log('🔍 [GET_MY_SURVEYS] Testing Database Connection...');
      const surveyCount = await Survey.count();
      console.log(`✅ [GET_MY_SURVEYS] Database Connection OK. Total Surveys in Database: ${surveyCount}`);
    } catch (dbError) {
      console.error('❌ [GET_MY_SURVEYS] Database Connection Failed:', dbError);
      throw new Error(`Database connection error: ${dbError.message}`);
    }

    // FIXED: Use explicit field mapping and snake_case for database columns
    console.log(`🔍 [GET_MY_SURVEYS] Executing Survey.findAll with Field Mapping Fix...`);
    const surveys = await Survey.findAll({ 
      where: { clientId },
      order: [['created_at', 'DESC']], // Use actual database column name (snake_case)
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
      raw: false // Get model instances for proper field mapping
    });
    
    console.log(`📊 [GET_MY_SURVEYS] Database Query Completed. Found ${surveys.length} Surveys for Client ${clientId}`);
    
    // Debug: Show first survey structure if any surveys found
    if (surveys.length > 0) {
      console.log('📋 [GET_MY_SURVEYS] First Survey Sample:', {
        id: surveys[0].id,
        title: surveys[0].title,
        clientId: surveys[0].clientId,
        status: surveys[0].status,
        hasQuestions: !!surveys[0].questions,
        questionsType: typeof surveys[0].questions,
        createdAt: surveys[0].createdAt // This should now work with field mapping
      });
    } else {
      console.log('ℹ️ [GET_MY_SURVEYS] No Surveys Found for This Client. This is normal if client has not created any surveys yet.');
    }

    // Process detailed statistics for each survey
    console.log('📈 [GET_MY_SURVEYS] Processing Statistics for Each Survey...');
    const surveysWithStats = await Promise.all(
      surveys.map(async (survey) => {
        try {
          console.log(`📈 [GET_MY_SURVEYS] Processing Survey ${survey.id}: "${survey.title}"`);
          
          // Count total responses for this survey
          console.log(`🔍 [GET_MY_SURVEYS] Counting Responses for Survey ${survey.id}...`);
          const responseCount = await Result.count({ 
            where: { surveyId: survey.id }
          });
          console.log(`✅ [GET_MY_SURVEYS] Survey ${survey.id} has ${responseCount} Responses`);
          
          // Check survey status based on expiration date
          const now = new Date();
          const expirationTime = new Date(survey.expirationTime);
          const status = now > expirationTime ? 'expired' : 'active';
          
          console.log(`🕒 [GET_MY_SURVEYS] Survey ${survey.id} Status Check:`, {
            now: now.toISOString(),
            expiration: expirationTime.toISOString(),
            calculatedStatus: status,
            currentStatus: survey.status
          });
          
          // Update survey status in database if it has changed
          if (survey.status !== status) {
            console.log(`🔄 [GET_MY_SURVEYS] Updating Survey ${survey.id} Status from "${survey.status}" to "${status}"`);
            await Survey.update({ status }, { where: { id: survey.id } });
          }

          // Compile comprehensive survey data for response
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
            // Additional useful information for frontend
            isExpired: now > expirationTime,
            daysUntilExpiration: Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24)),
            responsePercentage: survey.responseLimit ? 
              Math.min(100, Math.round((responseCount / survey.responseLimit) * 100)) : null
          };

          console.log(`✅ [GET_MY_SURVEYS] Survey ${survey.id} Processed Successfully:`, {
            responseCount,
            status,
            daysUntilExpiration: surveyData.daysUntilExpiration
          });
          
          return surveyData;

        } catch (surveyError) {
          console.error(`❌ [GET_MY_SURVEYS] Error Processing Survey ${survey.id}:`, surveyError);
          console.error(`❌ [GET_MY_SURVEYS] Survey Error Stack:`, surveyError.stack);
          
          // Return basic survey data in case of error to avoid complete failure
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
            error: 'Error loading statistics',
            errorDetails: process.env.NODE_ENV === 'development' ? surveyError.message : undefined
          };
        }
      })
    );

    console.log(`✅ [GET_MY_SURVEYS] Successfully Processed ${surveysWithStats.length} Surveys with Statistics`);
    
    // Calculate final statistics summary
    const stats = {
      total: surveysWithStats.length,
      active: surveysWithStats.filter(s => s.status === 'active').length,
      expired: surveysWithStats.filter(s => s.status === 'expired').length,
      totalResponses: surveysWithStats.reduce((sum, survey) => sum + (survey.responseCount || 0), 0)
    };
    
    console.log('📈 [GET_MY_SURVEYS] Final Statistics:', stats);
    
    // Return successful response with all survey data
    res.status(200).json({
      success: true,
      surveys: surveysWithStats,
      total: surveysWithStats.length,
      stats: stats,
      debug: process.env.NODE_ENV === 'development' ? {
        clientId,
        authentication: req.client,
        queryTime: new Date().toISOString()
      } : undefined
    });

  } catch (error) {
    console.error('❌ [GET_MY_SURVEYS] General Error:', error);
    console.error('❌ [GET_MY_SURVEYS] Error Stack:', error.stack);
    console.error('❌ [GET_MY_SURVEYS] Error Details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      parent: error.parent?.message
    });
    
    // Return error response with development details if enabled
    res.status(500).json({ 
      message: 'Failed to fetch client surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        errorCode: error.code,
        clientId: req.client?.id,
        stack: error.stack
      } : undefined
    });
  }
};

// Get client survey statistics summary
export const getClientSurveyStats = async (req, res) => {
  try {
    const clientId = req.client?.id;
    console.log(`📊 [GET_CLIENT_STATS] Fetching Statistics for Client ID: ${clientId}`);
    
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

    res.status(200).json({
      success: true,
      summary,
      clientId
    });

  } catch (error) {
    console.error('❌ [GET_CLIENT_STATS] Error:', error);
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
