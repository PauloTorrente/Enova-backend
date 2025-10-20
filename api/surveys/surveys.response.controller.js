import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('[Survey] Response received');
    const { accessToken } = req.query;
    const userId = req.user?.userId;

    // Validate required access token
    if (!accessToken) {
      console.error('❌ Access token missing');
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Find survey by token
    const survey = await Survey.findOne({ where: { accessToken } });
    if (!survey) {
      console.error('❌ Survey not found');
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Check response limit before processing
    const responseCount = await Result.count({ where: { surveyId: survey.id } });
    if (survey.responseLimit !== null && responseCount >= survey.responseLimit) {
      console.log(`🚫 Survey ${survey.id} reached response limit (${survey.responseLimit})`);
      return res.status(400).json({ 
        message: 'This survey has reached the maximum response limit.' 
      });
    }

    // Check for duplicate responses from same user
    const existingResponse = await Result.findOne({
      where: { surveyId: survey.id, userId }
    });

    if (existingResponse) {
      console.log(`⚠️ User ${userId} attempted duplicate response`);
      return res.status(400).json({ message: 'You have already responded to this survey.' });
    }

    // Validate response format is an array
    const response = req.body;
    if (!Array.isArray(response)) {
      console.error('❌ Invalid response format');
      return res.status(400).json({ message: 'Response should be an array' });
    }

    // Parse survey questions (handle both string and object formats)
    const questions = typeof survey.questions === 'string' 
      ? JSON.parse(survey.questions) 
      : survey.questions;

    console.log('🔍 Survey questions structure:', {
      totalQuestions: questions.length,
      firstQuestion: questions[0] ? {
        questionId: questions[0].questionId,
        question: questions[0].question,
        type: questions[0].type
      } : 'No questions'
    });

    // Process each response item with validation
    const resultEntries = response.map((item, index) => {
      console.log(`\n📝 Processing response ${index + 1}:`, {
        questionId: item.questionId,
        answer: item.answer
      });

      // Find the corresponding question in the survey
      const questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      if (!questionObj) {
        console.error('❌ Question not found for ID:', item.questionId);
        console.error('🔍 Available questions:', questions.map(q => ({
          questionId: q.questionId,
          id: q.id,
          question: q.question
        })));
        throw new Error(`Question with ID ${item.questionId} not found`);
      }

      // GET THE ACTUAL QUESTION TEXT - THIS IS THE KEY FIX
      const questionText = questionObj.question;
      
      if (!questionText) {
        console.error('❌ CRITICAL: questionObj.question is empty!', {
          questionObj,
          availableKeys: Object.keys(questionObj)
        });
        throw new Error(`Question text not found for question ID ${item.questionId}`);
      }

      console.log(`✅ Found question text: "${questionText}"`);

      // Validate answer based on question type
      if (questionObj.type === 'multiple') {
        // Multiple selection validation
        if (questionObj.multipleSelections === 'yes') {
          if (!Array.isArray(item.answer)) {
            throw new Error(`Question ${item.questionId} requires multiple answers (array)`);
          }
          // Validate each selected option exists in question options
          item.answer.forEach(ans => {
            if (!questionObj.options.includes(ans)) {
              throw new Error(`Invalid option "${ans}" for question ${item.questionId}`);
            }
          });
        } 
        // Single selection validation
        else {
          if (Array.isArray(item.answer)) {
            throw new Error(`Question ${item.questionId} only accepts a single answer`);
          }
          if (!questionObj.options.includes(item.answer)) {
            throw new Error(`Invalid option "${item.answer}" for question ${item.questionId}`);
          }
        }
      } else {
        // Non-multiple question validation (text, etc.)
        if (Array.isArray(item.answer)) {
          throw new Error(`Question ${item.questionId} does not accept multiple answers`);
        }
      }

      // Validate answer length for text questions
      validateAnswerLength(questionObj, item.answer);

      // CREATE THE RESULT ENTRY WITH THE ACTUAL QUESTION TEXT
      const resultEntry = {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionText, // ← THIS IS THE ACTUAL QUESTION CREATED BY THE USER/CLIENT
        answer: item.answer,
      };

      console.log('💾 Saving result with actual question text:', {
        question: resultEntry.question,
        answer: resultEntry.answer
      });

      return resultEntry;
    });

    // Final verification before saving
    console.log('\n🔍 FINAL VERIFICATION - All entries have actual question texts:');
    resultEntries.forEach((entry, index) => {
      console.log(`   Entry ${index + 1}:`, {
        question: entry.question,
        answer: entry.answer
      });
    });

    // Save all valid responses
    console.log('💾 Saving to database...');
    const savedResults = await Result.bulkCreate(resultEntries);
    
    console.log('✅ Survey responses recorded successfully with actual question texts');
    console.log('📊 Saved results count:', savedResults.length);

    // Immediate verification from database
    const recentlySaved = await Result.findAll({
      where: { 
        surveyId: survey.id,
        userId: userId 
      },
      order: [['id', 'DESC']],
      limit: 3,
      raw: true
    });

    console.log('🔍 DATABASE VERIFICATION - Recently saved results:');
    recentlySaved.forEach((result, index) => {
      console.log(`   Result ${index + 1}:`, {
        id: result.id,
        question: result.question,
        answer: result.answer
      });
    });

    return res.status(200).json({ 
      message: 'Response recorded successfully',
      details: {
        savedCount: savedResults.length,
        questions: resultEntries.map(entry => entry.question)
      }
    });
  } catch (error) {
    console.error('❌ Response recording error:', error.message);
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response'
    });
  }
};

// Helper function to validate answer length for text questions
function validateAnswerLength(question, answer) {
  const lengthConfigs = {
    short: { min: 1, max: 100 },
    medium: { min: 10, max: 300 },
    long: { min: 50, max: 1000 },
    unrestricted: { min: 0, max: Infinity }
  };

  if (question.answerLength && question.type === 'text') {
    const { min, max } = lengthConfigs[question.answerLength] || { min: 0, max: Infinity };
    const answerText = answer || '';

    if (answerText.length < min) {
      throw new Error(`Answer too short. Minimum required: ${min} characters`);
    }

    if (answerText.length > max) {
      throw new Error(`Answer too long. Maximum allowed: ${max} characters`);
    }
  }
}
