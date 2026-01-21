import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Permissive survey response handler - minimal validation
export const respondToSurveyPermissive = async (req, res) => {
  console.log('📝 [PERMISSIVE_RESPONSE] Processing survey response...');
  
  try {
    const { accessToken } = req.query;
    
    // Get user ID - supports both user and client authentication
    const userId = req.user?.userId || req.user?.id || req.userId || req.user?.clientId || null;
    
    console.log(`🔑 [PERMISSIVE_RESPONSE] Access token: ${accessToken ? 'provided' : 'missing'}`);
    console.log(`👤 [PERMISSIVE_RESPONSE] User ID: ${userId ? userId : 'not provided'}`);

    // Check if access token is provided
    if (!accessToken) {
      console.error('❌ [PERMISSIVE_RESPONSE] Access token missing');
      return res.status(400).json({ 
        message: 'Access token is required' 
      });
    }

    // Find survey by access token
    console.log(`🔍 [PERMISSIVE_RESPONSE] Finding survey with token...`);
    const survey = await Survey.findOne({ where: { accessToken } });
    
    if (!survey) {
      console.error('❌ [PERMISSIVE_RESPONSE] Survey not found');
      return res.status(404).json({ 
        message: 'Survey not found' 
      });
    }
    
    console.log(`✅ [PERMISSIVE_RESPONSE] Survey found: "${survey.title}" (ID: ${survey.id})`);

    // Check if survey has reached response limit
    const responseCount = await Result.count({ where: { surveyId: survey.id } });
    console.log(`📊 [PERMISSIVE_RESPONSE] Current response count: ${responseCount}/${survey.responseLimit || 'no limit'}`);
    
    if (survey.responseLimit !== null && responseCount >= survey.responseLimit) {
      console.error(`❌ [PERMISSIVE_RESPONSE] Response limit reached`);
      return res.status(400).json({ 
        message: 'This survey has reached the maximum response limit.' 
      });
    }

    // Check if user already responded to this survey
    if (userId) {
      console.log(`🔍 [PERMISSIVE_RESPONSE] Checking for previous responses from user ${userId}...`);
      const existingResponse = await Result.findOne({
        where: { surveyId: survey.id, userId }
      });

      if (existingResponse) {
        console.error(`❌ [PERMISSIVE_RESPONSE] User ${userId} already responded`);
        return res.status(400).json({ 
          message: 'You have already responded to this survey.' 
        });
      }
    }

    // Validate that response is an array
    const response = req.body;
    console.log(`📋 [PERMISSIVE_RESPONSE] Received ${Array.isArray(response) ? response.length : 'invalid'} response items`);
    
    if (!Array.isArray(response)) {
      console.error('❌ [PERMISSIVE_RESPONSE] Response is not an array');
      return res.status(400).json({ 
        message: 'Response should be an array' 
      });
    }

    // Parse survey questions
    const questions = typeof survey.questions === 'string' 
      ? JSON.parse(survey.questions) 
      : survey.questions;

    console.log(`❓ [PERMISSIVE_RESPONSE] Survey has ${questions.length} questions`);

    const resultEntries = [];
    const warnings = [];

    // Process each response item
    for (const item of response) {
      // Find question by ID
      let questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      // If not found by ID, try by numeric index
      if (!questionObj) {
        const numericId = parseInt(item.questionId);
        if (!isNaN(numericId)) {
          questionObj = questions[numericId - 1];
          if (questionObj) {
            warnings.push(`Question ID ${item.questionId} mapped to index ${numericId - 1}`);
          }
        }
      }

      // If still not found, use fallback
      if (!questionObj) {
        warnings.push(`Question with ID ${item.questionId} not found`);
        questionObj = {
          question: `Question ${item.questionId}`,
          type: 'text',
          multipleSelections: 'no'
        };
      }

      const questionText = questionObj.question || `Question ${item.questionId}`;
      
      // Basic validation for multiple choice questions
      if (questionObj.type === 'multiple') {
        if (questionObj.multipleSelections === 'yes') {
          // Ensure answer is an array for multiple selection
          if (!Array.isArray(item.answer)) {
            item.answer = [item.answer];
          }
          
          // Check selection limit if defined
          if (questionObj.selectionLimit && item.answer.length > questionObj.selectionLimit) {
            console.warn(`⚠️ [PERMISSIVE_RESPONSE] Selection limit exceeded for question "${questionText}"`);
            return res.status(400).json({
              message: `Question "${questionText}" allows maximum ${questionObj.selectionLimit} selection(s).`
            });
          }
        } else {
          // For single selection, extract first element if array
          if (Array.isArray(item.answer)) {
            item.answer = item.answer[0];
          }
        }
      }

      // Prepare result entry
      resultEntries.push({
        surveyId: survey.id,
        userId,
        question: questionText,
        answer: item.answer,
      });
    }

    // Save responses to database
    console.log(`💾 [PERMISSIVE_RESPONSE] Saving ${resultEntries.length} responses to database...`);
    const savedResults = await Result.bulkCreate(resultEntries);

    console.log(`✅ [PERMISSIVE_RESPONSE] Successfully saved ${savedResults.length} responses`);

    // Return success response
    return res.status(200).json({ 
      message: 'Response recorded successfully',
      details: {
        savedCount: savedResults.length,
        surveyId: survey.id,
        surveyTitle: survey.title,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    });
    
  } catch (error) {
    console.error('❌ [PERMISSIVE_RESPONSE] Error:', error.message);
    console.error('🔍 [PERMISSIVE_RESPONSE] Stack:', error.stack?.split('\n')[0]);
    
    // Return appropriate error response
    let statusCode = 500;
    let errorMessage = 'Internal error while recording response';
    
    if (error.name === 'SequelizeDatabaseError') {
      statusCode = 400;
      errorMessage = 'Database error occurred';
    } else if (error.message.includes('validation')) {
      statusCode = 400;
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export the controller function
export default {
  respondToSurveyPermissive
};
