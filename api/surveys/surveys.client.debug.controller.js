import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Special debug endpoint for troubleshooting client surveys
export const debugMySurveys = async (req, res) => {
  console.log('=== 🐛 [DEBUG_MY_SURVEYS] DEBUG ENDPOINT CALLED ===');
  
  try {
    const clientId = req.client?.id;
    
    console.log('🐛 [DEBUG_MY_SURVEYS] Client Authentication Debug:', {
      clientId: clientId,
      fullClientObject: req.client,
      userObject: req.user,
      headers: {
        authorization: req.headers.authorization,
        'content-type': req.headers['content-type']
      }
    });

    if (!clientId) {
      console.error('🐛 [DEBUG_MY_SURVEYS] NO CLIENT ID FOUND IN REQUEST');
      return res.status(403).json({ 
        success: false,
        message: 'No client ID found in request',
        debug: {
          clientInRequest: req.client,
          userInRequest: req.user,
          headers: req.headers
        }
      });
    }

    // Test 1: Simple count of surveys for this client
    console.log('🐛 [DEBUG_MY_SURVEYS] Test 1: Counting Surveys...');
    const surveyCount = await Survey.count({ where: { clientId } });
    console.log(`🐛 [DEBUG_MY_SURVEYS] Survey Count for Client ${clientId}: ${surveyCount}`);

    // Test 2: Retrieve sample of surveys with field mapping fix
    console.log('🐛 [DEBUG_MY_SURVEYS] Test 2: Finding Surveys with Field Mapping...');
    const surveys = await Survey.findAll({ 
      where: { clientId },
      order: [['created_at', 'DESC']], // Use snake_case for database column
      raw: true,
      limit: 5
    });
    
    console.log(`🐛 [DEBUG_MY_SURVEYS] Found ${surveys.length} Surveys Sample:`, 
      surveys.map(survey => ({
        id: survey.id,
        title: survey.title,
        clientId: survey.clientId,
        status: survey.status,
        createdAt: survey.created_at // Use actual database column name
      }))
    );

    // Test 3: Check database structure and available fields
    console.log('🐛 [DEBUG_MY_SURVEYS] Test 3: Checking Database Structure...');
    const sampleSurvey = surveys.length > 0 ? surveys[0] : null;
    
    // Return comprehensive debug information
    res.json({
      success: true,
      clientId,
      surveyCount,
      surveysSample: surveys.map(survey => ({
        id: survey.id,
        title: survey.title,
        clientId: survey.clientId,
        status: survey.status,
        hasQuestions: !!survey.questions,
        questionsType: typeof survey.questions,
        createdAt: survey.created_at // Show actual database value
      })),
      databaseInfo: {
        totalSurveysInDatabase: await Survey.count(),
        sampleSurveyStructure: sampleSurvey ? Object.keys(sampleSurvey) : 'No surveys found'
      },
      authentication: {
        clientId: req.client?.id,
        clientEmail: req.client?.email,
        clientCompany: req.client?.companyName
      },
      fieldMapping: {
        note: 'Using created_at for database column, mapped to createdAt in model',
        actualDatabaseColumn: 'created_at',
        modelField: 'createdAt'
      }
    });
    
  } catch (error) {
    console.error('🐛 [DEBUG_MY_SURVEYS] Debug Endpoint Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      clientId: req.client?.id
    });
  }
};

// Enhanced debug function for detailed survey analysis
export const debugSurveyDetails = async (req, res) => {
  console.log('=== 🔍 [DEBUG_SURVEY_DETAILS] DETAILED SURVEY ANALYSIS ===');
  
  try {
    const clientId = req.client?.id;
    const surveyId = req.params.surveyId;
    
    console.log('🔍 [DEBUG_SURVEY_DETAILS] Parameters:', { clientId, surveyId });

    if (!clientId) {
      return res.status(403).json({ 
        success: false,
        message: 'Client authentication required'
      });
    }

    if (!surveyId) {
      return res.status(400).json({ 
        success: false,
        message: 'Survey ID is required'
      });
    }

    // Get detailed survey information
    console.log('🔍 [DEBUG_SURVEY_DETAILS] Fetching survey details...');
    const survey = await Survey.findOne({ 
      where: { id: surveyId, clientId },
      raw: true
    });

    if (!survey) {
      return res.status(404).json({ 
        success: false,
        message: 'Survey not found or access denied'
      });
    }

    // Get response statistics
    console.log('🔍 [DEBUG_SURVEY_DETAILS] Fetching response statistics...');
    const responseCount = await Result.count({ where: { surveyId } });
    
    // Parse questions for analysis
    const questions = Array.isArray(survey.questions) 
      ? survey.questions 
      : JSON.parse(survey.questions || '[]');

    // Analyze questions structure
    const questionsAnalysis = questions.map((question, index) => ({
      index: index + 1,
      questionId: question.questionId,
      type: question.type,
      multipleSelections: question.multipleSelections,
      selectionLimit: question.selectionLimit,
      optionsCount: question.options?.length || 0,
      hasAnswerLength: !!question.answerLength,
      hasMedia: !!(question.imagem || question.video)
    }));

    // Return comprehensive debug analysis
    res.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        clientId: survey.clientId,
        expirationTime: survey.expirationTime,
        responseLimit: survey.responseLimit,
        accessToken: survey.accessToken,
        createdAt: survey.created_at,
        updatedAt: survey.updated_at
      },
      statistics: {
        responseCount,
        responsePercentage: survey.responseLimit 
          ? Math.min(100, Math.round((responseCount / survey.responseLimit) * 100))
          : null,
        isExpired: new Date() > new Date(survey.expirationTime),
        daysUntilExpiration: Math.ceil((new Date(survey.expirationTime) - new Date()) / (1000 * 60 * 60 * 24))
      },
      questionsAnalysis: {
        totalQuestions: questions.length,
        questions: questionsAnalysis,
        summary: {
          multipleChoice: questions.filter(q => q.type === 'multiple').length,
          textQuestions: questions.filter(q => q.type === 'text').length,
          withSelectionLimit: questions.filter(q => q.selectionLimit).length,
          withMedia: questions.filter(q => q.imagem || q.video).length
        }
      },
      databaseInfo: {
        tableName: 'surveys',
        clientIdField: 'client_id',
        timestampFields: ['created_at', 'updated_at']
      }
    });
    
  } catch (error) {
    console.error('🔍 [DEBUG_SURVEY_DETAILS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Health check for client surveys
export const healthCheckClientSurveys = async (req, res) => {
  console.log('=== 🩺 [HEALTH_CHECK] CLIENT SURVEYS HEALTH CHECK ===');
  
  try {
    const clientId = req.client?.id;
    
    if (!clientId) {
      return res.status(403).json({ 
        success: false,
        message: 'Client authentication required'
      });
    }

    const healthChecks = {
      databaseConnection: 'OK',
      surveyCount: 0,
      recentSurveys: [],
      issues: []
    };

    // Test database connection
    try {
      healthChecks.surveyCount = await Survey.count({ where: { clientId } });
    } catch (error) {
      healthChecks.databaseConnection = 'FAILED';
      healthChecks.issues.push(`Database connection failed: ${error.message}`);
    }

    // Check for recent surveys
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
        healthChecks.issues.push(`Failed to fetch recent surveys: ${error.message}`);
      }
    }

    res.json({
      success: true,
      clientId,
      healthChecks,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🩺 [HEALTH_CHECK] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export debug controller functions
export default {
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys
};