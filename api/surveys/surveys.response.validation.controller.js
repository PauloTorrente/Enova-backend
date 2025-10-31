import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';

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
    
    // VALIDAÇÃO DO SELECTION LIMIT
    console.log('🔍 Validating survey responses...');
    
    // Buscar detalhes da enquete para validação
    const surveyDetails = await Survey.findByPk(survey.id);
    const questions = Array.isArray(surveyDetails.questions) 
      ? surveyDetails.questions 
      : JSON.parse(surveyDetails.questions || '[]');

    // Validar cada resposta
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

      // VALIDAÇÃO DO SELECTION LIMIT
      if (question.type === 'multiple' && 
          question.multipleSelections === 'yes' && 
          question.selectionLimit) {
        
        console.log(`🔍 Validating selection limit for ${question.questionId}:`, {
          limit: question.selectionLimit,
          selected: Array.isArray(responseItem.answer) ? responseItem.answer.length : 0,
          questionText: question.question
        });

        if (Array.isArray(responseItem.answer) && responseItem.answer.length > question.selectionLimit) {
          console.error(`❌ Selection limit exceeded: ${responseItem.answer.length} > ${question.selectionLimit}`);
          return res.status(400).json({
            message: `Question "${question.question}" allows maximum ${question.selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
          });
        }
      }

      // Validação para seleção única com array
      if (question.type === 'multiple' && 
          question.multipleSelections === 'no' && 
          Array.isArray(responseItem.answer)) {
        console.error(`❌ Single selection question received array: ${question.questionId}`);
        return res.status(400).json({ 
          message: `Question "${question.question}" only accepts a single answer` 
        });
      }

      // Validação básica de opções para múltipla escolha
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

  const questions = Array.isArray(surveyDetails.questions) 
    ? surveyDetails.questions 
    : JSON.parse(surveyDetails.questions || '[]');

  const validationErrors = [];

  // Validar cada resposta
  for (const responseItem of responses) {
    const question = questions.find(q => 
      q.questionId === responseItem.questionId || q.id === responseItem.questionId
    );
    
    if (!question) {
      validationErrors.push(`Question with ID ${responseItem.questionId} not found`);
      continue;
    }

    // VALIDAÇÃO DO SELECTION LIMIT
    if (question.type === 'multiple' && 
        question.multipleSelections === 'yes' && 
        question.selectionLimit) {
      
      if (Array.isArray(responseItem.answer) && responseItem.answer.length > question.selectionLimit) {
        validationErrors.push(
          `Question "${question.question}" allows maximum ${question.selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
        );
      }
    }

    // Validação para seleção única com array
    if (question.type === 'multiple' && 
        question.multipleSelections === 'no' && 
        Array.isArray(responseItem.answer)) {
      validationErrors.push(`Question "${question.question}" only accepts a single answer`);
    }

    // Validação básica de opções para múltipla escolha
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

  return validationErrors;
};

// Export response validation controller functions
export default {
  respondToSurveyByToken,
  validateSurveyResponses
};
