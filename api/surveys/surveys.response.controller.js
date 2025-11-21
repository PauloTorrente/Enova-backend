import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Helper function to normalize survey questions
const normalizeSurveyQuestions = (survey) => {
  let questions = survey.questions;
  
  console.log('🔄 Normalizing survey questions:', {
    originalType: typeof questions,
    isArray: Array.isArray(questions)
  });

  // If questions is a string, parse to object
  if (typeof questions === 'string') {
    try {
      console.log('📝 Parsing questions from string to object');
      questions = JSON.parse(questions);
    } catch (error) {
      console.error('❌ Error parsing questions:', error);
      questions = [];
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(questions)) {
    console.warn('⚠️ Questions is not an array, converting to empty array');
    questions = [];
  }

  // Process each question to ensure correct types
  questions = questions.map((question, index) => {
    const normalizedQuestion = { ...question };
    
    // Normalize selectionLimit - convert string to number if necessary
    if (normalizedQuestion.selectionLimit !== undefined && normalizedQuestion.selectionLimit !== null) {
      if (typeof normalizedQuestion.selectionLimit === 'string') {
        const parsedLimit = parseInt(normalizedQuestion.selectionLimit);
        if (!isNaN(parsedLimit)) {
          normalizedQuestion.selectionLimit = parsedLimit;
          console.log(`✅ Converted selectionLimit from string to number: ${parsedLimit}`);
        }
      }
    }

    // Normalize multipleSelections - ensure consistent boolean/string format
    if (normalizedQuestion.multipleSelections !== undefined && normalizedQuestion.multipleSelections !== null) {
      if (typeof normalizedQuestion.multipleSelections === 'boolean') {
        normalizedQuestion.multipleSelections = normalizedQuestion.multipleSelections ? 'yes' : 'no';
      } else if (typeof normalizedQuestion.multipleSelections === 'string') {
        normalizedQuestion.multipleSelections = normalizedQuestion.multipleSelections.toLowerCase() === 'yes' ? 'yes' : 'no';
      }
    }

    return normalizedQuestion;
  });

  console.log('✅ Normalized questions structure:', {
    totalQuestions: questions.length,
    firstQuestion: questions[0] ? {
      questionId: questions[0].questionId,
      type: questions[0].type,
      multipleSelections: questions[0].multipleSelections,
      selectionLimit: questions[0].selectionLimit,
      selectionLimitType: typeof questions[0].selectionLimit
    } : 'No questions'
  });

  return {
    ...survey,
    questions: questions
  };
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

    // Normaliza as questions do survey
    const normalizedSurvey = normalizeSurveyQuestions(survey);
    const questions = normalizedSurvey.questions;

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

    console.log('🔍 Survey questions structure after normalization:', {
      totalQuestions: questions.length,
      questions: questions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        type: q.type,
        multipleSelections: q.multipleSelections,
        selectionLimit: q.selectionLimit,
        selectionLimitType: typeof q.selectionLimit,
        options: q.options ? q.options.length : 0
      }))
    });

    // Process each response item with validation
    const resultEntries = response.map((item, index) => {
      console.log(`\n📝 Processing response ${index + 1}:`, {
        questionId: item.questionId,
        answer: item.answer,
        answerType: typeof item.answer,
        isArray: Array.isArray(item.answer)
      });

      // LÓGICA PERMISSIVA - Tenta encontrar a questão de várias formas
      let questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      // Se não encontrou, tenta por índice numérico
      if (!questionObj) {
        const numericId = parseInt(item.questionId);
        if (!isNaN(numericId) && numericId > 0 && numericId <= questions.length) {
          questionObj = questions[numericId - 1];
          if (questionObj) {
            console.log(`🔄 Question ID ${item.questionId} mapeado para índice ${numericId - 1}`);
          }
        }
      }

      // Se ainda não encontrou, tenta buscar por posição no array
      if (!questionObj && index < questions.length) {
        questionObj = questions[index];
        if (questionObj) {
          console.log(`🔄 Usando questão na posição ${index} como fallback`);
        }
      }

      if (!questionObj) {
        console.error('❌ Question not found for ID:', item.questionId);
        console.error('🔍 Available questions:', questions.map(q => ({
          questionId: q.questionId,
          id: q.id,
          question: q.question,
          type: q.type
        })));
        throw new Error(`Question with ID ${item.questionId} not found`);
      }

      console.log('🎯 Question object found:', {
        questionId: questionObj.questionId,
        type: questionObj.type,
        multipleSelections: questionObj.multipleSelections,
        selectionLimit: questionObj.selectionLimit,
        selectionLimitType: typeof questionObj.selectionLimit,
        options: questionObj.options
      });

      // Get the actual question text from the survey
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
        console.log('🔍 Validating multiple choice question:', {
          multipleSelections: questionObj.multipleSelections,
          selectionLimit: questionObj.selectionLimit,
          answer: item.answer
        });

        // Multiple selection validation
        if (questionObj.multipleSelections === 'yes') {
          if (!Array.isArray(item.answer)) {
            throw new Error(`Question ${item.questionId} requires multiple answers (array)`);
          }
          
          // SELECTION LIMIT VALIDATION - with normalized types
          if (questionObj.selectionLimit && item.answer.length > questionObj.selectionLimit) {
            console.log('🚫 Selection limit exceeded:', {
              limit: questionObj.selectionLimit,
              selected: item.answer.length,
              answers: item.answer
            });
            throw new Error(
              `Question "${questionText}" allows maximum ${questionObj.selectionLimit} selection(s). You selected ${item.answer.length}.`
            );
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

      // Create the result entry with the actual question text
      const resultEntry = {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionText, // Use the actual question text from the survey
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

    // Save all valid responses to database
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

    // Return success response
    return res.status(200).json({ 
      message: 'Response recorded successfully',
      details: {
        savedCount: savedResults.length,
        questions: resultEntries.map(entry => entry.question)
      }
    });
  } catch (error) {
    console.error('❌ Response recording error:', error.message);
    console.error('🔍 Error details:', {
      stack: error.stack,
      requestBody: req.body,
      accessToken: req.query.accessToken
    });
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response'
    });
  }
};


export { normalizeSurveyQuestions, validateAnswerLength };
