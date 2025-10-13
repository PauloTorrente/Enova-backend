import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Create a new survey (accessible to both admin and clients)
export const createSurvey = async (req, res) => {
  try {
    console.log('=== 🚀 SURVEY CREATION STARTED ===');
    
    // Log request headers and authentication info for debugging
    console.log('📦 Request Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    
    console.log('🔑 Authentication Information:', {
      clientId: req.client?.id || 'None',
      userId: req.user?.userId || 'None',
      userRole: req.user?.role || 'None'
    });
    
    const surveyData = req.body;
    
    // Log the structure of received survey data
    console.log('📥 Received Survey Data Structure:', {
      hasTitle: !!surveyData.title,
      hasDescription: !!surveyData.description,
      hasQuestions: !!surveyData.questions,
      questionsIsArray: Array.isArray(surveyData.questions),
      questionsCount: Array.isArray(surveyData.questions) ? surveyData.questions.length : 'N/A',
      hasExpirationTime: !!surveyData.expirationTime,
      hasResponseLimit: !!surveyData.responseLimit
    });
    
    // Detailed analysis of each question in the survey
    if (surveyData.questions && Array.isArray(surveyData.questions)) {
      console.log(`\n📋 DETAILED QUESTIONS ANALYSIS (${surveyData.questions.length} questions):`);
      surveyData.questions.forEach((question, index) => {
        console.log(`\n❓ Question ${index + 1}:`);
        console.log(`   ✅ Type: ${question.type}`);
        console.log(`   ✅ Question Text: ${question.question ? question.question.substring(0, 50) + '...' : 'MISSING'}`);
        console.log(`   ✅ Question ID: ${question.questionId || 'MISSING'}`);
        console.log(`   ✅ Multiple Selections: ${question.multipleSelections} (${typeof question.multipleSelections})`);
        console.log(`   ✅ Answer Length: ${question.answerLength || 'Not specified'}`);
        console.log(`   ✅ Options Count: ${question.options?.length || 0}`);
        
        // Log first few options for debugging
        if (question.options && question.options.length > 0) {
          console.log(`   ✅ Options Preview: ${JSON.stringify(question.options.slice(0, 3))}`);
        }
        
        // Basic validation checks in controller
        if (!question.type) {
          console.log(`   ❌ ERROR: Question ${index + 1} missing type`);
        }
        if (!question.question) {
          console.log(`   ❌ ERROR: Question ${index + 1} missing question text`);
        }
        if (!question.questionId) {
          console.log(`   ❌ ERROR: Question ${index + 1} missing questionId`);
        }
      });
    } else {
      console.log('❌ CRITICAL: No questions found or questions is not an array');
      console.log('Questions Data Type:', typeof surveyData.questions);
      console.log('Questions Data Value:', surveyData.questions);
    }
    
    // Log full survey data (limited to avoid console pollution)
    console.log('\n📄 Full Survey Data (first 500 characters):');
    console.log(JSON.stringify(surveyData).substring(0, 500) + '...');
    
    // Auto-assign client ID if request comes from authenticated client
    if (req.client?.id) {
      surveyData.clientId = req.client.id;
      console.log(`\n🔗 Auto-assigned Client ID: ${req.client.id}`);
    }
    // Admin users can optionally specify clientId in request body
    else if (req.user?.role !== 'admin') {
      console.log('🚫 Access Denied - Not admin and no client ID provided');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('\n🔄 Calling Survey Service to Create Survey...');
    const survey = await surveysService.createSurvey(surveyData);
    
    console.log('\n🎉 Survey Created Successfully!');
    console.log('📊 Survey Details:', {
      id: survey.id,
      title: survey.title,
      questionsCount: Array.isArray(survey.questions) ? survey.questions.length : 'N/A',
      accessToken: survey.accessToken,
      clientId: survey.clientId
    });
    
    // Return successful response with created survey data
    res.status(201).json(survey);
  } catch (error) {
    console.error('\n❌ CREATE SURVEY ERROR:', error);
    console.error('📊 Error Details:', {
      name: error.name,
      message: error.message,
      constructor: error.constructor?.name
    });
    
    // Special handling for Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      console.error('🔍 SEQUELIZE VALIDATION ERRORS:');
      error.errors.forEach((err, index) => {
        console.error(`   ${index + 1}. Path: ${err.path}`);
        console.error(`      Message: ${err.message}`);
        console.error(`      Value: ${JSON.stringify(err.value)?.substring(0, 100)}...`);
        console.error(`      Type: ${err.type}`);
        console.error(`      Validator: ${err.validatorName}`);
      });
    }
    
    // Log stack trace for deeper debugging (limited to first 5 lines)
    if (error.stack) {
      console.error('🔍 Stack Trace (first 5 lines):');
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    // Return error response with optional development details
    res.status(500).json({ 
      message: 'Failed to create survey',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        validationErrors: error.errors?.map(err => ({
          path: err.path,
          message: err.message
        }))
      } : undefined
    });
  }
};

// Get all active surveys (public endpoint)
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('🔍 Fetching Active Surveys...');
    const surveys = await surveysService.getActiveSurveys();
    console.log(`✅ Found ${surveys.length} Active Surveys`);
    res.status(200).json({ surveys });
  } catch (error) {
    console.error('❌ Get Active Surveys Error:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Submit responses to a survey using access token
export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('📝 Survey Response Submission Started');
    const { accessToken } = req.query;
    
    // Validate that access token is provided
    if (!accessToken) {
      console.error('❌ Access Token Missing');
      return res.status(400).json({ message: 'Token required' });
    }

    console.log(`🔍 Looking for Survey with Token: ${accessToken}`);
    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey Not Found for Token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey Found: ${survey.title} (ID: ${survey.id})`);
    console.log(`👤 User ID: ${req.user?.userId || 'Anonymous'}`);
    console.log(`📋 Response Count: ${Array.isArray(req.body) ? req.body.length : 'Invalid'}`);
    
    // Save the survey responses
    await surveysService.saveResponse(survey.id, req.user?.userId, req.body);
    
    console.log('✅ Responses Saved Successfully');
    res.status(200).json({ message: 'Responses saved' });
  } catch (error) {
    console.error('❌ Submit Response Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    const surveyId = req.params.id;
    console.log(`🗑️ Deleting Survey ID: ${surveyId}`);
    
    await surveysService.deleteSurvey(surveyId);
    
    console.log(`✅ Survey ${surveyId} Deleted Successfully`);
    res.status(200).json({ message: 'Survey deleted' });
  } catch (error) {
    console.error('❌ Delete Survey Error:', error);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey details by access token (public endpoint)
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const { accessToken } = req.query;
    console.log(`🔍 Fetching Survey by Token: ${accessToken}`);
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Token required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey Not Found for Token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey Found: ${survey.title}`);
    res.status(200).json(survey);
  } catch (error) {
    console.error('❌ Get Survey Error:', error);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};

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

// Export all controller functions (removed analytics and results functions)
export default {
  createSurvey,
  getActiveSurveys,
  respondToSurveyByToken,
  deleteSurvey,
  getSurveyByAccessToken,
  getClientSurveys,
  getMySurveys,
  debugMySurveys
};
