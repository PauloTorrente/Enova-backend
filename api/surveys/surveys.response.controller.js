import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('[Survey] Response received');
    const { accessToken } = req.query;
    const userId = req.user?.userId;

    if (!accessToken) {
      console.error('❌ Access token missing');
      return res.status(400).json({ message: 'Access token is required' });
    }

    const survey = await Survey.findOne({ where: { accessToken } });
    if (!survey) {
      console.error('❌ Survey not found');
      return res.status(404).json({ message: 'Survey not found' });
    }

    const existingResponse = await Result.findOne({
      where: { surveyId: survey.id, userId }
    });

    if (existingResponse) {
      console.log(`⚠️ User ${userId} attempted duplicate response`);
      return res.status(400).json({ message: 'You have already responded to this survey.' });
    }

    const response = req.body;
    if (!Array.isArray(response)) {
      console.error('❌ Invalid response format');
      return res.status(400).json({ message: 'Response should be an array' });
    }

    const questions = typeof survey.questions === 'string' 
      ? JSON.parse(survey.questions) 
      : survey.questions;

    const resultEntries = response.map(item => {
      const questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      if (!questionObj) {
        console.error('❌ Question not found:', item.questionId);
        throw new Error(`Question with ID ${item.questionId} not found`);
      }

      validateAnswerLength(questionObj, item.answer);

      return {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionObj.question || questionObj.text,
        answer: item.answer,
      };
    });

    await Result.bulkCreate(resultEntries);
    console.log('✅ Survey response recorded');
    return res.status(200).json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('❌ Response recording error:', error.message);
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response',
      details: error.details || null
    });
  }
};

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
