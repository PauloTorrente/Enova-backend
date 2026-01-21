import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';

// Helper function to normalize survey questions
const normalizeSurveyQuestions = (survey) => {
  if (!survey) {
    console.error('❌ Survey normalization failed: survey is null');
    return null;
  }
  
  let questions = survey.questions;
  
  // Parse string questions to object
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (error) {
      console.error('Error parsing questions:', error.message);
      questions = [];
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(questions)) {
    questions = [];
  }
  
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questions: questions,
    expirationTime: survey.expirationTime,
    status: survey.status,
    accessToken: survey.accessToken,
    clientId: survey.clientId,
    responseLimit: survey.responseLimit,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt
  };
};

// Submit responses to a survey using access token
export const respondToSurveyByToken = async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📝 Survey response submission started');
    const { accessToken } = req.query;
    
    // Validate access token
    if (!accessToken) {
      console.error('❌ Missing access token');
      return res.status(400).json({ message: 'Access token is required' });
    }

    console.log(`🔍 Finding survey with token: ${accessToken.substring(0, 8)}...`);
    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey not found');
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Get user ID - accept both userId and clientId
    const userId = req.user?.userId || req.user?.id || req.userId || req.user?.clientId || null;
    
    console.log(`✅ Survey found: "${survey.title}" (ID: ${survey.id})`);
    console.log(`👤 User: ${userId || 'Not authenticated'}`);
    
    // Validate user ID is present
    if (!userId) {
      console.error('❌ Authentication required');
      return res.status(401).json({ 
        message: 'Authentication required. Please log in to respond to this survey.' 
      });
    }
    
    // Normalize survey questions
    const normalizedSurvey = normalizeSurveyQuestions(survey);
    if (!normalizedSurvey) {
      console.error('❌ Failed to process survey data');
      return res.status(500).json({ message: 'Failed to process survey data' });
    }
    
    const questions = normalizedSurvey.questions;

    // Validate questions array
    if (!questions || questions.length === 0) {
      console.error('❌ Survey has no questions');
      return res.status(400).json({ message: 'Survey has no questions' });
    }

    console.log(`📊 Validating ${req.body.length} response(s) to ${questions.length} question(s)`);
    
    // Validate each response
    for (const responseItem of req.body) {
      const question = questions.find(q => 
        q.questionId === responseItem.questionId || q.id === responseItem.questionId
      );
      
      if (!question) {
        console.error(`❌ Question "${responseItem.questionId}" not found in survey`);
        return res.status(400).json({ 
          message: `Question with ID ${responseItem.questionId} not found` 
        });
      }

      // Special validation for "other" option
      if (question.otherOption === true) {
        if (typeof responseItem.answer !== 'object' || responseItem.answer === null) {
          console.error(`❌ Invalid answer format for question with "other" option`);
          return res.status(400).json({ 
            message: `For question "${question.question}" with "other" option, answer must be an object with selectedOptions/selectedOption and otherText fields` 
          });
        }
        
        // For multiple selection
        if (question.multipleSelections === 'yes' && responseItem.answer.selectedOptions) {
          const selectedOptions = responseItem.answer.selectedOptions || [];
          const otherText = responseItem.answer.otherText || '';
          
          // Validate selection limit
          if (question.selectionLimit) {
            const selectionLimit = Number(question.selectionLimit);
            if (selectedOptions.length > selectionLimit) {
              console.error(`❌ Selection limit exceeded: ${selectedOptions.length} > ${selectionLimit}`);
              return res.status(400).json({
                message: `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${selectedOptions.length}.`
              });
            }
          }
          
          // Validate options and other text
          for (const option of selectedOptions) {
            if (option === 'other') {
              if (!otherText || otherText.trim().length === 0) {
                console.error(`❌ Missing text for "other" option`);
                return res.status(400).json({ 
                  message: `When selecting "other", you must provide text for question "${question.question}"` 
                });
              }
            } else if (!question.options.includes(option)) {
              console.error(`❌ Invalid option: "${option}"`);
              return res.status(400).json({ 
                message: `Invalid option "${option}" for question "${question.question}"` 
              });
            }
          }
          
          if (selectedOptions.length === 0) {
            console.error(`❌ No options selected`);
            return res.status(400).json({ 
              message: `You must select at least one option for question "${question.question}"` 
            });
          }
        }
        // For single selection
        else if (question.multipleSelections === 'no' && responseItem.answer.selectedOption !== undefined) {
          const selectedOption = responseItem.answer.selectedOption;
          const otherText = responseItem.answer.otherText || '';
          
          if (selectedOption === 'other') {
            if (!otherText || otherText.trim().length === 0) {
              console.error(`❌ Missing text for "other" option`);
              return res.status(400).json({ 
                message: `When selecting "other", you must provide text for question "${question.question}"` 
              });
            }
          } else if (!question.options.includes(selectedOption)) {
            console.error(`❌ Invalid option: "${selectedOption}"`);
            return res.status(400).json({ 
              message: `Invalid option "${selectedOption}" for question "${question.question}"` 
            });
          }
        }
        else {
          console.error(`❌ Invalid answer structure for question with "other" option`);
          return res.status(400).json({ 
            message: `Invalid answer structure for question "${question.question}"` 
          });
        }
      }
      // Validation for questions without "other" option
      else {
        if (question.type === 'multiple') {
          // Selection limit validation for multiple selection
          if (question.multipleSelections === 'yes' && question.selectionLimit) {
            const selectionLimit = Number(question.selectionLimit);
            
            if (!Array.isArray(responseItem.answer)) {
              console.error(`❌ Answer must be an array for multiple selection`);
              return res.status(400).json({ 
                message: `Question "${question.question}" requires multiple selections` 
              });
            }
            
            if (responseItem.answer.length > selectionLimit) {
              console.error(`❌ Selection limit exceeded: ${responseItem.answer.length} > ${selectionLimit}`);
              return res.status(400).json({
                message: `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
              });
            }
            
            // Validate each option
            for (const answer of responseItem.answer) {
              if (!question.options.includes(answer)) {
                console.error(`❌ Invalid option: "${answer}"`);
                return res.status(400).json({ 
                  message: `Invalid option "${answer}" for question "${question.question}"` 
                });
              }
            }
          }
          // Single selection validation
          else if (question.multipleSelections === 'no' && Array.isArray(responseItem.answer)) {
            console.error(`❌ Single selection question received array`);
            return res.status(400).json({ 
              message: `Question "${question.question}" only accepts a single answer` 
            });
          }
        }
        
        // Basic options validation
        if (question.type === 'multiple') {
          const answers = Array.isArray(responseItem.answer) ? responseItem.answer : [responseItem.answer];
          for (const answer of answers) {
            if (!question.options || !question.options.includes(answer)) {
              console.error(`❌ Invalid option: "${answer}"`);
              return res.status(400).json({ 
                message: `Invalid option "${answer}" for question "${question.question}"` 
              });
            }
          }
        }
      }
    }

    console.log('✅ All responses validated');
    
    // Save responses
    console.log(`💾 Saving responses for user ${userId}...`);
    await surveysService.saveResponse(survey.id, userId, req.body);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Responses saved successfully (${duration}ms)`);
    
    res.status(200).json({ 
      message: 'Responses saved successfully',
      surveyTitle: survey.title,
      surveyId: survey.id,
      userId: userId,
      questionsAnswered: req.body.length,
      responseTime: `${duration}ms`
    });
  } catch (error) {
    console.error('❌ Survey response error:', error.message);
    
    // Return appropriate error response
    let statusCode = 500;
    let errorMessage = 'An error occurred while processing your response';
    
    if (error.message.includes('already responded')) {
      statusCode = 400;
      errorMessage = 'You have already responded to this survey';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('Authentication required')) {
      statusCode = 401;
      errorMessage = 'Authentication required. Please log in to respond to this survey.';
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        debug: error.message 
      })
    });
  }
};

// Helper function to validate survey responses
export const validateSurveyResponses = async (surveyId, responses) => {
  const surveyDetails = await Survey.findByPk(surveyId);
  if (!surveyDetails) {
    throw new Error('Survey not found');
  }

  const normalizedSurvey = normalizeSurveyQuestions(surveyDetails);
  if (!normalizedSurvey) {
    throw new Error('Failed to normalize survey questions');
  }
  
  const questions = normalizedSurvey.questions;
  const validationErrors = [];

  for (const responseItem of responses) {
    const question = questions.find(q => 
      q.questionId === responseItem.questionId || q.id === responseItem.questionId
    );
    
    if (!question) {
      validationErrors.push(`Question with ID ${responseItem.questionId} not found`);
      continue;
    }

    // Selection limit validation
    if (question.type === 'multiple' && 
        question.multipleSelections === 'yes' && 
        question.selectionLimit) {
      
      const selectionLimit = Number(question.selectionLimit);
      
      if (Array.isArray(responseItem.answer) && responseItem.answer.length > selectionLimit) {
        validationErrors.push(
          `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
        );
      }
    }

    // Single selection validation
    if (question.type === 'multiple' && 
        question.multipleSelections === 'no' && 
        Array.isArray(responseItem.answer)) {
      validationErrors.push(`Question "${question.question}" only accepts a single answer`);
    }

    // Basic options validation
    if (question.type === 'multiple') {
      const answers = Array.isArray(responseItem.answer) ? responseItem.answer : [responseItem.answer];
      for (const answer of answers) {
        if (!question.options || !question.options.includes(answer)) {
          validationErrors.push(`Invalid option "${answer}" for question "${question.question}"`);
        }
      }
    }
  }

  return validationErrors;
};

// Export response validation controller functions
export default {
  respondToSurveyByToken,
  validateSurveyResponses
};
