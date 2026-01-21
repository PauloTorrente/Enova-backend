import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Helper function to normalize survey questions
const normalizeSurveyQuestions = (survey) => {
  if (!survey) {
    console.error('[SURVEY] Error: Survey is null or undefined');
    return null;
  }
  
  let questions = survey.questions;
  
  // If questions is a string, parse to object
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (error) {
      console.error('[SURVEY] Error parsing questions:', error.message);
      questions = [];
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(questions)) {
    console.warn('[SURVEY] Warning: Questions is not an array, converting to empty array');
    questions = [];
  }

  // Process each question to ensure correct types
  questions = questions.map((question) => {
    const normalizedQuestion = { ...question };
    
    // Normalize selectionLimit - convert string to number if necessary
    if (normalizedQuestion.selectionLimit !== undefined && normalizedQuestion.selectionLimit !== null) {
      if (typeof normalizedQuestion.selectionLimit === 'string') {
        const parsedLimit = parseInt(normalizedQuestion.selectionLimit);
        if (!isNaN(parsedLimit)) {
          normalizedQuestion.selectionLimit = parsedLimit;
        }
      }
    }

    // Normalize multipleSelections - ensure consistent format
    if (normalizedQuestion.multipleSelections !== undefined && normalizedQuestion.multipleSelections !== null) {
      if (typeof normalizedQuestion.multipleSelections === 'boolean') {
        normalizedQuestion.multipleSelections = normalizedQuestion.multipleSelections ? 'yes' : 'no';
      } else if (typeof normalizedQuestion.multipleSelections === 'string') {
        normalizedQuestion.multipleSelections = normalizedQuestion.multipleSelections.toLowerCase() === 'yes' ? 'yes' : 'no';
      }
    }

    // Normalize otherOption - ensure boolean
    if (normalizedQuestion.otherOption !== undefined && normalizedQuestion.otherOption !== null) {
      if (typeof normalizedQuestion.otherOption === 'string') {
        normalizedQuestion.otherOption = normalizedQuestion.otherOption.toLowerCase() === 'true' || normalizedQuestion.otherOption === '1';
      }
    }

    // Ensure default otherOptionText if otherOption is true
    if (normalizedQuestion.otherOption === true && !normalizedQuestion.otherOptionText) {
      normalizedQuestion.otherOptionText = 'Other (specify)';
    }

    return normalizedQuestion;
  });

  console.log(`[SURVEY] Normalized ${questions.length} questions`);

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

// Helper function to validate "other" option text length
function validateOtherTextLength(question, otherText) {
  const lengthConfigs = {
    short: { min: 1, max: 100 },
    medium: { min: 10, max: 300 },
    long: { min: 50, max: 1000 },
    unrestricted: { min: 0, max: Infinity }
  };

  if (question.answerLength && question.type === 'multiple') {
    const { min, max } = lengthConfigs[question.answerLength] || { min: 0, max: Infinity };
    
    if (otherText && otherText.length < min) {
      throw new Error(`Other text too short. Minimum required: ${min} characters`);
    }

    if (otherText && otherText.length > max) {
      throw new Error(`Other text too long. Maximum allowed: ${max} characters`);
    }
  }
}

// Helper function to normalize "other" option responses
const normalizeOtherOptionResponse = (question, answer) => {
  // If the question doesn't have "other" option, return answer as is
  if (!question.otherOption) {
    return answer;
  }
  
  // If the answer is an object with "other" option structure
  if (typeof answer === 'object' && (answer.otherText !== undefined || answer.selectedOptions || answer.selectedOption)) {
    
    // For multiple selection
    if (question.multipleSelections === 'yes' && answer.selectedOptions) {
      const finalAnswer = [...answer.selectedOptions];
      
      // If "other" is selected and has text, add as special option
      if (answer.selectedOptions.includes('other') && answer.otherText && answer.otherText.trim()) {
        const otherOptionText = question.otherOptionText || 'Other';
        const combinedText = `${otherOptionText}: ${answer.otherText}`;
        // Replace 'other' with combined text
        const index = finalAnswer.indexOf('other');
        if (index > -1) {
          finalAnswer[index] = combinedText;
        }
      }
      // If "other" is selected but without text, remove 'other'
      else if (answer.selectedOptions.includes('other') && (!answer.otherText || !answer.otherText.trim())) {
        const index = finalAnswer.indexOf('other');
        if (index > -1) {
          finalAnswer.splice(index, 1);
        }
      }
      
      return finalAnswer;
    } 
    // For single selection
    else if (question.multipleSelections === 'no' && answer.selectedOption) {
      // If "other" is selected and has text
      if (answer.selectedOption === 'other' && answer.otherText && answer.otherText.trim()) {
        const otherOptionText = question.otherOptionText || 'Other';
        return `${otherOptionText}: ${answer.otherText}`;
      }
      // If "other" is selected but no text, return the selected option
      else if (answer.selectedOption === 'other' && (!answer.otherText || !answer.otherText.trim())) {
        return null;
      }
      // If a regular option is selected
      else {
        return answer.selectedOption;
      }
    }
  }
  
  // If we get here, return answer as is (could be a regular string or array)
  return answer;
};

// Main function to submit survey responses
export const respondToSurveyByToken = async (req, res) => {
  try {
    console.log('[SURVEY] Response submission started');
    const { accessToken } = req.query;
    
    // Get user ID from authentication - SUPPORT BOTH USER AND CLIENT AUTHENTICATION
    const userId = req.user?.userId || req.user?.id || req.userId || req.user?.clientId || null;
    
    // Validate required access token
    if (!accessToken) {
      console.error('[SURVEY] Error: Access token missing');
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Validate user ID is present (no anonymous responses allowed)
    if (!userId) {
      console.error('[SURVEY] Error: Authentication required');
      return res.status(401).json({ 
        message: 'Authentication required. Please log in to respond to this survey.'
      });
    }

    // Find survey by token
    const survey = await Survey.findOne({ where: { accessToken } });
    if (!survey) {
      console.error('[SURVEY] Error: Survey not found');
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`[SURVEY] Found: "${survey.title}" (ID: ${survey.id})`);
    console.log(`[AUTH] User ID: ${userId}`);

    // Normalize survey questions
    const normalizedSurvey = normalizeSurveyQuestions(survey);
    if (!normalizedSurvey) {
      console.error('[SURVEY] Error: Failed to normalize survey');
      return res.status(500).json({ message: 'Failed to process survey data' });
    }
    
    const questions = normalizedSurvey.questions || [];
    if (!Array.isArray(questions)) {
      console.error('[SURVEY] Error: Invalid questions format');
      return res.status(500).json({ message: 'Invalid survey questions format' });
    }

    // Check response limit
    const responseCount = await Result.count({ where: { surveyId: survey.id } });
    if (survey.responseLimit !== null && responseCount >= survey.responseLimit) {
      console.log(`[SURVEY] Error: Response limit reached (${survey.responseLimit})`);
      return res.status(400).json({ 
        message: 'This survey has reached the maximum response limit.' 
      });
    }

    // Check for duplicate responses
    const existingResponse = await Result.findOne({
      where: { surveyId: survey.id, userId }
    });

    if (existingResponse) {
      console.log(`[SURVEY] Error: Duplicate response attempt by user ${userId}`);
      return res.status(400).json({ message: 'You have already responded to this survey.' });
    }

    // Validate response format
    const response = req.body;
    if (!Array.isArray(response)) {
      console.error('[SURVEY] Error: Invalid response format');
      return res.status(400).json({ message: 'Response should be an array' });
    }

    console.log(`[SURVEY] Processing ${response.length} responses`);

    // Process each response item with validation
    const resultEntries = response.map((item, index) => {
      // Try to find the question in multiple ways
      let questionObj = questions.find(q => 
        q.questionId === item.questionId || q.id === item.questionId
      );

      // If not found by ID, try by numeric index
      if (!questionObj) {
        const numericId = parseInt(item.questionId);
        if (!isNaN(numericId) && numericId > 0 && numericId <= questions.length) {
          questionObj = questions[numericId - 1];
        }
      }

      // If still not found, try to find by position in array
      if (!questionObj && index < questions.length) {
        questionObj = questions[index];
      }

      if (!questionObj) {
        throw new Error(`Question with ID ${item.questionId} not found`);
      }

      const questionId = questionObj.questionId || item.questionId;
      const questionType = questionObj.type || 'text';
      const multipleSelections = questionObj.multipleSelections || 'no';
      const selectionLimit = questionObj.selectionLimit || null;
      const questionOptions = questionObj.options || [];
      const hasOtherOption = questionObj.otherOption || false;
      const otherOptionText = questionObj.otherOptionText || 'Other';

      const questionText = questionObj.question || `Question ${questionId}`;
      
      if (!questionText) {
        throw new Error(`Question text not found for question ID ${questionId}`);
      }

      // Validate answer based on question type
      if (questionType === 'multiple') {
        // Check if question has "other" option
        if (hasOtherOption === true) {
          // For multiple selection
          if (multipleSelections === 'yes') {
            // If answer is an object with "other" option structure
            if (typeof item.answer === 'object' && item.answer.selectedOptions !== undefined) {
              const selectedOptions = item.answer.selectedOptions || [];
              const otherText = item.answer.otherText || '';
              
              // Validate that selectedOptions is an array
              if (!Array.isArray(selectedOptions)) {
                throw new Error(`For multiple selection with "other" option, selectedOptions must be an array`);
              }
              
              // Validate selection limit
              const totalSelections = selectedOptions.length;
              if (selectionLimit && totalSelections > selectionLimit) {
                throw new Error(`Question "${questionText}" allows maximum ${selectionLimit} selection(s). You selected ${totalSelections}.`);
              }
              
              // Validate that selected options are valid
              selectedOptions.forEach(option => {
                if (option !== 'other' && !questionOptions.includes(option)) {
                  throw new Error(`Invalid option "${option}" for question "${questionText}"`);
                }
              });
              
              // If "other" is selected, validate the text
              if (selectedOptions.includes('other')) {
                if (!otherText || otherText.trim().length === 0) {
                  throw new Error(`When selecting "other", you must provide text`);
                }
                
                // Validate "other" text length
                validateOtherTextLength(questionObj, otherText);
              }
              
              // If no option was selected
              if (selectedOptions.length === 0) {
                throw new Error(`You must select at least one option for question "${questionText}"`);
              }
              
              // Normalize answer for saving
              item.answer = {
                selectedOptions: selectedOptions,
                otherText: otherText.trim()
              };
            }
            // If answer is a regular array
            else if (Array.isArray(item.answer)) {
              // Validate selection limit
              if (selectionLimit && item.answer.length > selectionLimit) {
                throw new Error(
                  `Question "${questionText}" allows maximum ${selectionLimit} selection(s). You selected ${item.answer.length}.`
                );
              }
              
              // Validate each selected option
              item.answer.forEach(ans => {
                if (ans === 'other' && !hasOtherOption) {
                  throw new Error(`Option "other" is not available for this question`);
                }
                if (ans !== 'other' && !questionOptions.includes(ans)) {
                  throw new Error(`Invalid option "${ans}" for question "${questionText}"`);
                }
              });
            }
            else {
              throw new Error(`Question "${questionText}" requires multiple selections (array)`);
            }
          }
          // For single selection
          else if (multipleSelections === 'no') {
            // If answer is an object with "other" option structure
            if (typeof item.answer === 'object' && item.answer.selectedOption !== undefined) {
              const selectedOption = item.answer.selectedOption;
              const otherText = item.answer.otherText || '';
              
              if (selectedOption === 'other') {
                // Validate "other" text if "other" is selected
                if (!otherText || otherText.trim().length === 0) {
                  throw new Error(`When selecting "other", you must provide text`);
                }
                
                // Validate "other" text length
                validateOtherTextLength(questionObj, otherText);
              } else if (!questionOptions.includes(selectedOption)) {
                throw new Error(`Invalid option "${selectedOption}" for question "${questionText}"`);
              }
            }
            // If answer is a regular string
            else if (typeof item.answer === 'string') {
              if (item.answer === 'other' && !hasOtherOption) {
                throw new Error(`Option "other" is not available for this question`);
              }
              if (item.answer !== 'other' && !questionOptions.includes(item.answer)) {
                throw new Error(`Invalid option "${item.answer}" for question "${questionText}"`);
              }
              
              if (item.answer === 'other') {
                throw new Error(`When selecting "other", you must provide text in the otherText field`);
              }
            }
            // If answer is an array (error)
            else if (Array.isArray(item.answer)) {
              throw new Error(`Question "${questionText}" only accepts a single answer`);
            }
          }
        }
        // If question does NOT have "other" option
        else {
          // Multiple selection validation
          if (multipleSelections === 'yes') {
            if (!Array.isArray(item.answer)) {
              throw new Error(`Question "${questionText}" requires multiple answers (array)`);
            }
            
            // SELECTION LIMIT VALIDATION
            if (selectionLimit && item.answer.length > selectionLimit) {
              throw new Error(
                `Question "${questionText}" allows maximum ${selectionLimit} selection(s). You selected ${item.answer.length}.`
              );
            }
            
            // Validate each selected option
            item.answer.forEach(ans => {
              if (!questionOptions.includes(ans)) {
                throw new Error(`Invalid option "${ans}" for question "${questionText}"`);
              }
            });
          } 
          // Single selection validation
          else {
            if (Array.isArray(item.answer)) {
              throw new Error(`Question "${questionText}" only accepts a single answer`);
            }
            if (!questionOptions.includes(item.answer)) {
              throw new Error(`Invalid option "${item.answer}" for question "${questionText}"`);
            }
          }
        }
      } else {
        // Non-multiple question validation
        if (Array.isArray(item.answer)) {
          throw new Error(`Question "${questionText}" does not accept multiple answers`);
        }
      }

      // Validate answer length for text questions
      validateAnswerLength(questionObj, item.answer);

      // Normalize answer with "other" option before saving
      const finalAnswer = normalizeOtherOptionResponse(questionObj, item.answer);

      // Create the result entry
      return {
        surveyId: survey.id,
        userId,
        surveyTitle: survey.title,
        question: questionText,
        answer: finalAnswer,
      };
    });

    console.log(`[SURVEY] Validated ${resultEntries.length} responses`);

    // Save all valid responses to database
    const savedResults = await Result.bulkCreate(resultEntries);
    
    console.log(`[SURVEY] Saved ${savedResults.length} responses to database`);

    // Return success response
    return res.status(200).json({ 
      message: 'Response recorded successfully',
      details: {
        savedCount: savedResults.length,
        surveyId: survey.id,
        surveyTitle: survey.title,
        userId: userId
      }
    });
  } catch (error) {
    console.error('[SURVEY] Error recording response:', error.message);
    
    // Return error response
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('already responded')) {
      statusCode = 400;
      errorMessage = 'You have already responded to this survey';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
    } else if (error.message.includes('Authentication required')) {
      statusCode = 401;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' ? {
        debug: {
          errorName: error.name,
          errorMessage: error.message
        }
      } : undefined)
    });
  }
};

// Safe wrapper function for normalizeSurveyQuestions
const safeNormalizeSurveyQuestions = (survey) => {
  try {
    if (!survey) {
      console.error('[SURVEY] Error: Survey is null or undefined');
      return null;
    }
    return normalizeSurveyQuestions(survey);
  } catch (error) {
    console.error('[SURVEY] Error normalizing questions:', error.message);
    return null;
  }
};

// Export helper functions for use in other modules
export { 
  normalizeSurveyQuestions, 
  safeNormalizeSurveyQuestions, 
  validateAnswerLength, 
  validateOtherTextLength, 
  normalizeOtherOptionResponse 
};
