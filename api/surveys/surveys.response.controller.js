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

    // Process each response item with validation
    const resultEntries = response.map(item => {
      const questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      if (!questionObj) {
        console.error('❌ Question not found:', item.questionId);
        throw new Error(`Question with ID ${item.questionId} not found`);
      }

      // Validate answer based on question type
      if (questionObj.type === 'multiple') {
        // Multiple selection validation (now checking for "yes" instead of boolean)
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
        // Single selection validation (multipleSelections === 'no')
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

      return {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionObj.question || questionObj.text,
        answer: item.answer,
      };
    });

    // Save all valid responses
    await Result.bulkCreate(resultEntries);
    console.log('✅ Survey response recorded successfully');
    return res.status(200).json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('❌ Response recording error:', error.message);
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response',
      details: error.details || null
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
