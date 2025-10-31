import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Get client's surveys with response counts
export const getClientSurveys = async (req, res) => {
  try {
    const clientId = req.client?.id;
    console.log(`🔍 [GET_CLIENT_SURVEYS] Fetching Surveys for Client ID: ${clientId}`);
    
    if (!clientId) {
      console.error('❌ [GET_CLIENT_SURVEYS] Client ID Missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`🔍 [GET_CLIENT_SURVEYS] Querying Database for Client ${clientId}...`);
    const surveys = await Survey.findAll({ 
      where: { clientId }
    });
    
    console.log(`📊 [GET_CLIENT_SURVEYS] Found ${surveys.length} Surveys for Client ${clientId}`);
    
    // Add response count statistics to each survey
    const surveysWithStats = await Promise.all(
      surveys.map(async survey => {
        const responseCount = await Result.count({ where: { surveyId: survey.id } });
        console.log(`   📈 [GET_CLIENT_SURVEYS] Survey ${survey.id}: ${responseCount} Responses`);
        return {
          ...survey.toJSON(),
          responseCount
        };
      })
    );
    
    console.log(`✅ [GET_CLIENT_SURVEYS] Returning ${surveysWithStats.length} Surveys with Statistics`);
    res.status(200).json({ surveys: surveysWithStats });
  } catch (error) {
    console.error('❌ [GET_CLIENT_SURVEYS] Get Client Surveys Error:', error);
    console.error('❌ [GET_CLIENT_SURVEYS] Error Stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export main client controller functions
export default {
  getClientSurveys
};
