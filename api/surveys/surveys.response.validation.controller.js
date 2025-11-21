import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';

// Helper function to normalize survey questions
const normalizeSurveyQuestions = (survey) => {
  let questions = survey.questions;
  
  // If questions is string, parse to object
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (error) {
      console.error('Error parsing questions:', error);
      questions = [];
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(questions)) {
    questions = [];
  }
  
  return {
    ...survey,
    questions: questions
  };
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
    
    // VALIDATE SELECTION LIMIT
    console.log('🔍 Validating survey responses...');
    
    // Get survey details for validation with proper question normalization
    const surveyDetails = await Survey.findByPk(survey.id);
    
    // Normalize questions to ensure proper parsing
    const normalizedSurvey = normalizeSurveyQuestions(surveyDetails);
    const questions = normalizedSurvey.questions;

    console.log(`📊 Questions to validate: ${questions.length}`);
    
    // Validate each response
    for (const responseItem of req.body) {
      const question = questions.find(q => 
        q.questionId === responseItem.questionId || q.id === responseItem.questionId
      );
      
      if (!question) {
        console.error(`❌ Question not found: ${responseItem.questionId}`);
        return res.status(400).json({ 
          message: `Question with ID ${responseItem.questionId} not found` 
        });
      }

      // SELECTION LIMIT VALIDATION
      if (question.type === 'multiple' && 
          (question.multipleSelections === 'yes' || question.multipleSelections === true) && 
          question.selectionLimit) {
        
        console.log(`🔍 Validating selection limit for ${question.questionId}:`, {
          limit: question.selectionLimit,
          selected: Array.isArray(responseItem.answer) ? responseItem.answer.length : 0,
          questionText: question.question,
          selectionLimitType: typeof question.selectionLimit
        });

        // Ensure selectionLimit is a number
        const selectionLimit = Number(question.selectionLimit);
        
        if (Array.isArray(responseItem.answer) && responseItem.answer.length > selectionLimit) {
          console.error(`❌ Selection limit exceeded: ${responseItem.answer.length} > ${selectionLimit}`);
          return res.status(400).json({
            message: `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
          });
        }
      }

      // Validation for single selection with array
      if (question.type === 'multiple' && 
          (question.multipleSelections === 'no' || question.multipleSelections === false) && 
          Array.isArray(responseItem.answer)) {
        console.error(`❌ Single selection question received array: ${question.questionId}`);
        return res.status(400).json({ 
          message: `Question "${question.question}" only accepts a single answer` 
        });
      }

      // Basic options validation for multiple choice
      if (question.type === 'multiple' && Array.isArray(responseItem.answer)) {
        for (const answer of responseItem.answer) {
          if (!question.options.includes(answer)) {
            console.error(`❌ Invalid option selected: ${answer}`);
            return res.status(400).json({ 
              message: `Invalid option "${answer}" for question "${question.question}"` 
            });
          }
        }
      } else if (question.type === 'multiple' && !Array.isArray(responseItem.answer)) {
        if (!question.options.includes(responseItem.answer)) {
          console.error(`❌ Invalid option selected: ${responseItem.answer}`);
          return res.status(400).json({ 
            message: `Invalid option "${responseItem.answer}" for question "${question.question}"` 
          });
        }
      }
    }

    console.log('✅ All responses validated successfully');
    
    // Save the survey responses
    await surveysService.saveResponse(survey.id, req.user?.userId, req.body);
    
    console.log('✅ Responses Saved Successfully');
    res.status(200).json({ message: 'Responses saved' });
  } catch (error) {
    console.error('❌ Submit Response Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to validate survey responses (can be used by other controllers)
export const validateSurveyResponses = async (surveyId, responses) => {
  console.log('🔍 [VALIDATE_RESPONSES] Validating survey responses...');
  
  const surveyDetails = await Survey.findByPk(surveyId);
  if (!surveyDetails) {
    throw new Error('Survey not found');
  }

  // Normalize questions to ensure proper parsing
  const normalizedSurvey = normalizeSurveyQuestions(surveyDetails);
  const questions = normalizedSurvey.questions;

  const validationErrors = [];

  // Validate each response
  for (const responseItem of responses) {
    const question = questions.find(q => 
      q.questionId === responseItem.questionId || q.id === responseItem.questionId
    );
    
    if (!question) {
      validationErrors.push(`Question with ID ${responseItem.questionId} not found`);
      continue;
    }

    // SELECTION LIMIT VALIDATION
    if (question.type === 'multiple' && 
        (question.multipleSelections === 'yes' || question.multipleSelections === true) && 
        question.selectionLimit) {
      
      // Ensure selectionLimit is a number
      const selectionLimit = Number(question.selectionLimit);
      
      if (Array.isArray(responseItem.answer) && responseItem.answer.length > selectionLimit) {
        validationErrors.push(
          `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
        );
      }
    }

    // Validation for single selection with array
    if (question.type === 'multiple' && 
        (question.multipleSelections === 'no' || question.multipleSelections === false) && 
        Array.isArray(responseItem.answer)) {
      validationErrors.push(`Question "${question.question}" only accepts a single answer`);
    }

    // Basic options validation for multiple choice
    if (question.type === 'multiple' && Array.isArray(responseItem.answer)) {
      for (const answer of responseItem.answer) {
        if (!question.options.includes(answer)) {
          validationErrors.push(`Invalid option "${answer}" for question "${question.question}"`);
        }
      }
    } else if (question.type === 'multiple' && !Array.isArray(responseItem.answer)) {
      if (!question.options.includes(responseItem.answer)) {
        validationErrors.push(`Invalid option "${responseItem.answer}" for question "${question.question}"`);
      }
    }
  }

  console.log(`📊 Validation completed: ${validationErrors.length} errors found`);
  return validationErrors;
};

// Export response validation controller functions
export default {
  respondToSurveyByToken,
  validateSurveyResponses
};
