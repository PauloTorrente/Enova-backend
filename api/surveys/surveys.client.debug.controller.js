import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Diagnostic mode: set to true for detailed logs, false for clean logs
const DIAGNOSTIC_MODE = process.env.NODE_ENV === 'development';

const log = (prefix, message, data = null) => {
  if (DIAGNOSTIC_MODE) {
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  } else {
    // In production, only show simplified logs
    if (prefix.includes('❌') || prefix.includes('⚠️')) {
      console.log(`${prefix} ${message}`);
    }
  }
};

// Special debug endpoint for troubleshooting client surveys
export const debugMySurveys = async (req, res) => {
  log('🔍', 'Debug endpoint: Client surveys check');
  
  try {
    const clientId = req.client?.id;
    
    if (!clientId) {
      log('❌', 'No client ID found in request');
      return res.status(403).json({ 
        success: false,
        message: 'Authentication required',
        debug: DIAGNOSTIC_MODE ? {
          clientInRequest: req.client,
          userInRequest: req.user
        } : undefined
      });
    }

    log('📊', `Processing request for client: ${clientId}`);

    // Count surveys for this client
    const surveyCount = await Survey.count({ where: { clientId } });
    log('✅', `Found ${surveyCount} surveys for client ${clientId}`);

    // Retrieve sample of surveys
    const surveys = await Survey.findAll({ 
      where: { clientId },
      order: [['created_at', 'DESC']],
      raw: true,
      limit: 5
    });
    
    log('✅', `Retrieved ${surveys.length} survey samples`);

    // Check database structure
    const sampleSurvey = surveys.length > 0 ? surveys[0] : null;
    
    // Return diagnostic information
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

// Enhanced debug function for detailed survey analysis
export const debugSurveyDetails = async (req, res) => {
  log('🔍', 'Detailed survey analysis requested');
  
  try {
    const clientId = req.client?.id;
    const surveyId = req.params.surveyId;

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

    log('📋', `Analyzing survey ${surveyId} for client ${clientId}`);

    // Get detailed survey information
    const survey = await Survey.findOne({ 
      where: { id: surveyId, clientId },
      raw: true
    });

    if (!survey) {
      log('❌', `Survey ${surveyId} not found or access denied`);
      return res.status(404).json({ 
        success: false,
        message: 'Survey not found or access denied'
      });
    }

    // Get response statistics
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
      optionsCount: question.options?.length || 0
    }));

    log('✅', `Survey analysis completed: ${questions.length} questions, ${responseCount} responses`);

    // Return comprehensive analysis
    res.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        clientId: survey.clientId,
        expirationTime: survey.expirationTime,
        responseLimit: survey.responseLimit,
        accessToken: survey.accessToken
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
          withSelectionLimit: questions.filter(q => q.selectionLimit).length
        }
      },
      diagnostics: DIAGNOSTIC_MODE ? {
        rawQuestionsType: typeof survey.questions,
        hasQuestions: !!survey.questions
      } : undefined
    });
    
  } catch (error) {
    log('❌', 'Survey analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze survey',
      details: DIAGNOSTIC_MODE ? error.message : undefined
    });
  }
};

// Health check for client surveys
export const healthCheckClientSurveys = async (req, res) => {
  log('🩺', 'Client surveys health check');
  
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
      log('✅', `Database connection OK. Surveys found: ${healthChecks.surveyCount}`);
    } catch (error) {
      healthChecks.databaseConnection = 'FAILED';
      healthChecks.issues.push(`Database connection failed`);
      log('❌', 'Database connection failed:', error.message);
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
        
        log('✅', `Retrieved ${recentSurveys.length} recent surveys`);
      } catch (error) {
        healthChecks.issues.push(`Failed to fetch recent surveys`);
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

// Export debug controller functions
export default {
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys
};
