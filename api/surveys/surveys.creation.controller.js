import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';

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
        console.log(`   ✅ Selection Limit: ${question.selectionLimit || 'Not specified'}`);
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

// Export creation controller functions
export default {
  createSurvey,
  getActiveSurveys
};
