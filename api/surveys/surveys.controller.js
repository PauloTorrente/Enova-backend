import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import User from '../users/users.model.js';

// Create survey (admin or client)
export const createSurvey = async (req, res) => {
  try {
    console.log('=== 🚀 SURVEY CREATION STARTED ===');
    console.log('📦 Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    
    console.log('🔑 Authentication info:', {
      clientId: req.client?.id || 'None',
      userId: req.user?.userId || 'None',
      userRole: req.user?.role || 'None'
    });
    
    const surveyData = req.body;
    console.log('📥 Raw request body received - Structure:', {
      hasTitle: !!surveyData.title,
      hasDescription: !!surveyData.description,
      hasQuestions: !!surveyData.questions,
      questionsIsArray: Array.isArray(surveyData.questions),
      questionsCount: Array.isArray(surveyData.questions) ? surveyData.questions.length : 'N/A',
      hasExpirationTime: !!surveyData.expirationTime,
      hasResponseLimit: !!surveyData.responseLimit
    });
    
    // Log detalhado das perguntas
    if (surveyData.questions && Array.isArray(surveyData.questions)) {
      console.log(`\n📋 DETAILED QUESTIONS ANALYSIS (${surveyData.questions.length} questions):`);
      surveyData.questions.forEach((question, index) => {
        console.log(`\n❓ Question ${index + 1}:`);
        console.log(`   ✅ Type: ${question.type}`);
        console.log(`   ✅ Question text: ${question.question ? question.question.substring(0, 50) + '...' : 'MISSING'}`);
        console.log(`   ✅ Question ID: ${question.questionId || 'MISSING'}`);
        console.log(`   ✅ Multiple Selections: ${question.multipleSelections} (${typeof question.multipleSelections})`);
        console.log(`   ✅ Answer Length: ${question.answerLength || 'Not specified'}`);
        console.log(`   ✅ Options count: ${question.options?.length || 0}`);
        
        if (question.options && question.options.length > 0) {
          console.log(`   ✅ Options preview: ${JSON.stringify(question.options.slice(0, 3))}`);
        }
        
        // Validação básica no controller
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
      console.log('Questions data type:', typeof surveyData.questions);
      console.log('Questions data value:', surveyData.questions);
    }
    
    // Log do corpo completo (apenas primeira parte para não poluir muito)
    console.log('\n📄 Full survey data (first 500 chars):');
    console.log(JSON.stringify(surveyData).substring(0, 500) + '...');
    
    // Auto-assign client ID if request comes from client
    if (req.client?.id) {
      surveyData.clientId = req.client.id;
      console.log(`\n🔗 Auto-assigned client ID: ${req.client.id}`);
    }
    // Admin can optionally specify clientId in request body
    else if (req.user?.role !== 'admin') {
      console.log('🚫 Access denied - not admin and no client ID');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('\n🔄 Calling survey service...');
    const survey = await surveysService.createSurvey(surveyData);
    
    console.log('\n🎉 Survey created successfully!');
    console.log('📊 Survey details:', {
      id: survey.id,
      title: survey.title,
      questionsCount: Array.isArray(survey.questions) ? survey.questions.length : 'N/A',
      accessToken: survey.accessToken,
      clientId: survey.clientId
    });
    
    res.status(201).json(survey);
  } catch (error) {
    console.error('\n❌ CREATE SURVEY ERROR:', error);
    console.error('📊 Error details:', {
      name: error.name,
      message: error.message,
      constructor: error.constructor?.name
    });
    
    // Log de validação específica do Sequelize
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
    
    // Log do stack trace (apenas as primeiras linhas)
    if (error.stack) {
      console.error('🔍 Stack trace (first 5 lines):');
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
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

// Get active surveys (public)
export const getActiveSurveys = async (req, res) => {
  try {
    console.log('🔍 Fetching active surveys...');
    const surveys = await surveysService.getActiveSurveys();
    console.log(`✅ Found ${surveys.length} active surveys`);
    res.status(200).json({ surveys });
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Submit survey responses
export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('📝 Survey response submission started');
    const { accessToken } = req.query;
    
    if (!accessToken) {
      console.error('❌ Access token missing');
      return res.status(400).json({ message: 'Token required' });
    }

    console.log(`🔍 Looking for survey with token: ${accessToken}`);
    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey not found for token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey found: ${survey.title} (ID: ${survey.id})`);
    console.log(`👤 User ID: ${req.user?.userId}`);
    console.log(`📋 Response count: ${Array.isArray(req.body) ? req.body.length : 'Invalid'}`);
    
    await surveysService.saveResponse(survey.id, req.user?.userId, req.body);
    
    console.log('✅ Responses saved successfully');
    res.status(200).json({ message: 'Responses saved' });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    const surveyId = req.params.id;
    console.log(`🗑️ Deleting survey ID: ${surveyId}`);
    
    await surveysService.deleteSurvey(surveyId);
    
    console.log(`✅ Survey ${surveyId} deleted successfully`);
    res.status(200).json({ message: 'Survey deleted' });
  } catch (error) {
    console.error('Delete survey error:', error);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey by token (public)
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const { accessToken } = req.query;
    console.log(`🔍 Fetching survey by token: ${accessToken}`);
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Token required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey not found for token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey found: ${survey.title}`);
    res.status(200).json(survey);
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};

// Get client's surveys with response counts
export const getClientSurveys = async (req, res) => {
  try {
    const clientId = req.client?.id;
    console.log(`🔍 Fetching surveys for client ID: ${clientId}`);
    
    if (!clientId) {
      console.error('❌ Client ID missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    const surveys = await Survey.findAll({ 
      where: { clientId }
    });
    
    console.log(`📊 Found ${surveys.length} surveys for client`);
    
    const surveysWithStats = await Promise.all(
      surveys.map(async s => {
        const responseCount = await Result.count({ where: { surveyId: s.id } });
        console.log(`   📈 Survey ${s.id}: ${responseCount} responses`);
        return {
          ...s.toJSON(),
          responseCount
        };
      })
    );
    
    console.log(`✅ Returning ${surveysWithStats.length} surveys with stats`);
    res.status(200).json({ surveys: surveysWithStats });
  } catch (error) {
    console.error('Get client surveys error:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

// Get survey results (owner only)
export const getSurveyResults = async (req, res) => {
  try {
    const surveyId = req.params.id;
    const clientId = req.client?.id;
    
    console.log(`📈 Fetching results for survey ID: ${surveyId}, client ID: ${clientId}`);
    
    if (!clientId) {
      console.error('❌ Client ID missing');
      return res.status(403).json({ message: 'Access denied' });
    }

    const survey = await Survey.findOne({ 
      where: { id: surveyId, clientId }
    });
    
    if (!survey) {
      console.error(`❌ Survey ${surveyId} not found or access denied for client ${clientId}`);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey found: ${survey.title}`);
    
    const results = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User,
        attributes: ['firstName', 'lastName', 'age', 'city']
      }]
    });

    console.log(`📊 Found ${results.length} responses for survey`);
    res.status(200).json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
};

export default {
  createSurvey,
  getActiveSurveys,
  respondToSurveyByToken,
  deleteSurvey,
  getSurveyByAccessToken,
  getClientSurveys,
  getSurveyResults
};
