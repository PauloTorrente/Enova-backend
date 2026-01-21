import { Op } from 'sequelize';
import Result from './results.model.js'; // Importing the Result model to interact with the database
import User from '../users/users.model.js';
import Survey from '../surveys/surveys.model.js';

// Helper function to parse and normalize answers with "other" option
const parseAnswerWithOtherOption = (answer, questionData = null) => {
  let parsedAnswer = answer;
  
  // Se for string, tentar parsear JSON
  if (typeof parsedAnswer === 'string') {
    try {
      parsedAnswer = JSON.parse(parsedAnswer);
    } catch (e) {
      // Manter como string se não for JSON válido
    }
  }
  
  // Formatar resposta com "outros" para exibição
  if (typeof parsedAnswer === 'object' && parsedAnswer.otherText !== undefined) {
    const otherOptionText = questionData?.otherOptionText || 'Outro (especifique)';
    
    // Para múltipla seleção com array
    if (parsedAnswer.selectedOptions !== undefined) {
      const options = parsedAnswer.selectedOptions.map(opt => {
        if (opt === 'other') {
          return `${otherOptionText}: ${parsedAnswer.otherText || ''}`;
        }
        return opt;
      }).filter(opt => opt !== null);
      
      // Se tiver texto em "outros", garantir que está incluído
      if (parsedAnswer.otherText && parsedAnswer.otherText.trim()) {
        // Verificar se já não foi adicionado
        const otherFormatted = `${otherOptionText}: ${parsedAnswer.otherText}`;
        if (!options.includes(otherFormatted)) {
          options.push(otherFormatted);
        }
      }
      
      parsedAnswer = options;
    }
    // Para seleção única
    else if (parsedAnswer.selectedOption === 'other') {
      parsedAnswer = `${otherOptionText}: ${parsedAnswer.otherText || ''}`;
    }
  }
  // Verificar se é string que começa com "Outro: " (formato legado)
  else if (typeof parsedAnswer === 'string' && parsedAnswer.includes('Outro: ')) {
    // Manter como está para compatibilidade
  }
  
  return parsedAnswer;
};

// Function to save a response to the database
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
    console.log('Starting saveResponse...'); // Debugging log
    console.log(`surveyId: ${surveyId}, userId: ${userId}, surveyTitle: ${surveyTitle}, question: ${question}, answer:`, answer); // Debugging log

    // Check if all required fields are provided
    if (!surveyId || !userId || !surveyTitle || !question || answer === undefined) {
      throw new Error('All fields (surveyId, userId, surveyTitle, question, and answer) are required');
    }

    // Handle answers with "other" option
    let formattedAnswer = answer;
    
    // Se for um objeto com "otherText", stringificar
    if (typeof answer === 'object' && answer.otherText !== undefined) {
      console.log('📝 [SAVE_RESPONSE] Answer contains other option, stringifying...');
      formattedAnswer = JSON.stringify(answer);
    }
    // Para array answers, stringificar
    else if (Array.isArray(answer)) {
      formattedAnswer = JSON.stringify(answer);
    }
    // Para outros tipos, manter como está
    else {
      formattedAnswer = answer;
    }

    console.log('📤 [SAVE_RESPONSE] Formatted answer for saving:', formattedAnswer);

    // Creating a new response entry in the Result model
    const newResult = await Result.create({
      surveyId, // Linking the response to the survey
      userId, // Linking the response to the user
      surveyTitle, // Storing the survey title
      question, // The specific question being answered
      answer: formattedAnswer, // The answer provided by the user
    });

    console.log('✅ [SAVE_RESPONSE] Response saved successfully:', newResult.id); // Debugging log
    return newResult; // Returning the saved result entry
  } catch (error) {
    console.error('❌ [SAVE_RESPONSE] Error in saveResponse:', error.message); // Debugging log
    console.error('🔍 [SAVE_RESPONSE] Error stack:', error.stack); // Debugging log
    throw new Error('Error saving response to the database: ' + error.message);
  }
};

// Function to get all responses for a specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    console.log('🔍 [REPOSITORY] Starting getResponsesBySurvey...'); // Debugging log
    console.log(`📋 [REPOSITORY] surveyId: ${surveyId}`); // Debugging log

    // Ensure surveyId is provided
    if (!surveyId) {
      throw new Error('surveyId is required');
    }

    // Buscar informações da survey para obter dados das questões
    const survey = await Survey.findByPk(surveyId);
    let surveyQuestions = [];
    
    if (survey && survey.questions) {
      try {
        surveyQuestions = typeof survey.questions === 'string' 
          ? JSON.parse(survey.questions) 
          : survey.questions;
      } catch (e) {
        console.error('❌ [REPOSITORY] Error parsing survey questions:', e.message);
      }
    }

    // Fetching all responses for the specific survey from the Result model
    const responses = await Result.findAll({
      where: {
        surveyId, // Only get results that match the specific survey
      },
      raw: true // Get plain objects instead of model instances
    });

    // Parse JSON answers back to arrays/objects and handle "other" option
    const parsedResponses = responses.map(r => {
      // Encontrar dados da questão correspondente
      const questionData = surveyQuestions.find(q => 
        q.question === r.question || q.questionId === r.questionId
      );
      
      const parsedAnswer = parseAnswerWithOtherOption(r.answer, questionData);
      
      return {
        ...r,
        answer: parsedAnswer,
        questionData: questionData ? {
          type: questionData.type,
          multipleSelections: questionData.multipleSelections,
          otherOption: questionData.otherOption,
          otherOptionText: questionData.otherOptionText
        } : null
      };
    });

    console.log(`✅ [REPOSITORY] Found ${parsedResponses.length} responses for surveyId: ${surveyId}`); // Debugging log
    
    // Log first few responses for debugging
    if (parsedResponses.length > 0) {
      console.log('📋 [REPOSITORY] Sample parsed responses:');
      parsedResponses.slice(0, 3).forEach((r, index) => {
        console.log(`   Response ${index + 1}:`, {
          id: r.id,
          question: r.question,
          answer: r.answer,
          hasOtherOption: r.questionData?.otherOption || false
        });
      });
    }

    return parsedResponses; // Returning the list of responses
  } catch (error) {
    console.error('❌ [REPOSITORY] Error in getResponsesBySurvey:', error.message); // Debugging log
    console.error('🔍 [REPOSITORY] Error details:', error); // Debugging log
    throw new Error('Error fetching responses for survey: ' + error.message);
  }
};

// Function to get all responses for a specific user
export const getUserResponses = async (userId) => {
  try {
    console.log('🔍 [REPOSITORY] Starting getUserResponses...'); // Debugging log
    console.log(`📋 [REPOSITORY] userId: ${userId}`); // Debugging log

    // Ensure userId is provided
    if (!userId) {
      throw new Error('userId is required');
    }

    // Fetching all responses for the specific user from the Result model
    const responses = await Result.findAll({
      where: {
        userId, // Only get results that belong to the specific user
      },
      raw: true // Get plain objects instead of model instances
    });

    // Parse JSON answers back to arrays/objects
    const parsedResponses = responses.map(r => {
      const parsedAnswer = parseAnswerWithOtherOption(r.answer);
      
      return {
        ...r,
        answer: parsedAnswer
      };
    });

    console.log(`✅ [REPOSITORY] Found ${parsedResponses.length} responses for userId: ${userId}`); // Debugging log
    return parsedResponses; // Returning the list of user responses
  } catch (error) {
    console.error('❌ [REPOSITORY] Error in getUserResponses:', error.message); // Debugging log
    console.error('🔍 [REPOSITORY] Error details:', error); // Debugging log
    throw new Error('Error fetching responses for user: ' + error.message);
  }
};

// Function to get all responses for a specific question in a survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    console.log('🔍 [REPOSITORY] Starting getResponsesByQuestion...'); // Debugging log
    console.log(`📋 [REPOSITORY] surveyId: ${surveyId}, question: ${question}`); // Debugging log

    // Ensure surveyId and question are provided
    if (!surveyId || !question) {
      throw new Error('surveyId and question are required');
    }

    // Buscar informações da survey para obter dados da questão específica
    const survey = await Survey.findByPk(surveyId);
    let questionData = null;
    
    if (survey && survey.questions) {
      try {
        const questions = typeof survey.questions === 'string' 
          ? JSON.parse(survey.questions) 
          : survey.questions;
        
        questionData = questions.find(q => 
          q.question === question || q.questionId === question
        );
      } catch (e) {
        console.error('❌ [REPOSITORY] Error parsing survey questions:', e.message);
      }
    }

    // Fetching all responses for a specific question in a survey
    const responses = await Result.findAll({
      where: {
        surveyId, // The survey to which the question belongs
        question, // The specific question being answered
      },
      raw: true // Get plain objects instead of model instances
    });

    // Parse JSON answers back to arrays/objects
    const parsedResponses = responses.map(r => {
      const parsedAnswer = parseAnswerWithOtherOption(r.answer, questionData);
      
      return {
        ...r,
        answer: parsedAnswer,
        questionData: questionData ? {
          type: questionData.type,
          multipleSelections: questionData.multipleSelections,
          otherOption: questionData.otherOption,
          otherOptionText: questionData.otherOptionText
        } : null
      };
    });

    console.log(`✅ [REPOSITORY] Found ${parsedResponses.length} responses for surveyId: ${surveyId}, question: "${question}"`); // Debugging log
    
    // Log responses with "other" option
    const otherResponses = parsedResponses.filter(r => 
      r.questionData?.otherOption && 
      typeof r.answer === 'string' && 
      r.answer.includes('Outro: ')
    );
    
    if (otherResponses.length > 0) {
      console.log(`📝 [REPOSITORY] Found ${otherResponses.length} responses with "other" option:`);
      otherResponses.slice(0, 3).forEach((r, index) => {
        console.log(`   Other response ${index + 1}: "${r.answer}"`);
      });
    }

    return parsedResponses; // Returning the list of responses for the specific question
  } catch (error) {
    console.error('❌ [REPOSITORY] Error in getResponsesByQuestion:', error.message); // Debugging log
    console.error('🔍 [REPOSITORY] Error details:', error); // Debugging log
    throw new Error('Error fetching responses for question: ' + error.message);
  }
};

// Function to get survey responses with associated user details - ATUALIZADO
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    console.log(`🔍 [REPOSITORY] Fetching responses with user details for survey: ${surveyId}`); // Debugging log
    
    // Buscar informações da survey para obter dados das questões
    const survey = await Survey.findByPk(surveyId);
    let surveyQuestions = [];
    
    if (survey && survey.questions) {
      try {
        surveyQuestions = typeof survey.questions === 'string' 
          ? JSON.parse(survey.questions) 
          : survey.questions;
      } catch (e) {
        console.error('❌ [REPOSITORY] Error parsing survey questions:', e.message);
      }
    }
    
    // Fetch responses including user information
    const responses = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User, // User model imported at the top
        as: 'user', // Association alias for proper mapping
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'residentialArea', 'gender', 'age', 'score'] // User fields to include
      }]
    });

    console.log(`✅ [REPOSITORY] Found ${responses.length} responses with user details`); // Debugging log

    // Convert to plain objects and parse answers
    const parsedResponses = responses.map(r => {
      const responseData = r.toJSON ? r.toJSON() : r; // Convert Sequelize instance to plain object if needed
      
      // Encontrar dados da questão correspondente
      const questionData = surveyQuestions.find(q => 
        q.question === responseData.question || q.questionId === responseData.questionId
      );
      
      // Parse answer with "other" option support
      const parsedAnswer = parseAnswerWithOtherOption(responseData.answer, questionData);
      
      return {
        ...responseData,
        answer: parsedAnswer,
        questionData: questionData ? {
          type: questionData.type,
          multipleSelections: questionData.multipleSelections,
          otherOption: questionData.otherOption,
          otherOptionText: questionData.otherOptionText,
          options: questionData.options
        } : null
      };
    });

    // Debug: log first response to verify question field is populated
    if (parsedResponses.length > 0) {
      console.log('📋 [REPOSITORY] First response sample:'); // Debugging log
      const firstResponse = parsedResponses[0];
      console.log({
        id: firstResponse.id,
        question: firstResponse.question,
        answer: firstResponse.answer,
        answerType: typeof firstResponse.answer,
        hasUser: !!firstResponse.user,
        questionData: firstResponse.questionData ? {
          type: firstResponse.questionData.type,
          hasOtherOption: firstResponse.questionData.otherOption,
          otherOptionText: firstResponse.questionData.otherOptionText
        } : 'No question data',
        userData: firstResponse.user ? {
          id: firstResponse.user.id,
          name: `${firstResponse.user.firstName} ${firstResponse.user.lastName}`,
          score: firstResponse.user.score
        } : 'No user data'
      });
      
      // Log responses with "other" option
      const otherResponses = parsedResponses.filter(r => 
        r.questionData?.otherOption && 
        typeof r.answer === 'string' && 
        r.answer.includes('Outro: ')
      );
      
      if (otherResponses.length > 0) {
        console.log(`📝 [REPOSITORY] Total responses with "other" option: ${otherResponses.length}`);
        otherResponses.slice(0, 3).forEach((r, index) => {
          console.log(`   Other response ${index + 1}:`, {
            userId: r.userId,
            userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Unknown',
            answer: r.answer
          });
        });
      }
    } else {
      console.log('ℹ️ [REPOSITORY] No responses found for this survey');
    }

    return parsedResponses; // Returning the list of responses with user details
  } catch (error) {
    console.error('❌ [REPOSITORY] Error fetching responses with user details:', error.message); // Debugging log
    console.error('🔍 [REPOSITORY] Error details:', error); // Debugging log
    console.error('🔍 [REPOSITORY] Error stack:', error.stack); // Debugging log
    throw new Error('Error fetching responses with user details: ' + error.message);
  }
};

// NEW FUNCTION: Get responses with detailed "other" option analysis
export const getOtherOptionResponses = async (surveyId, questionId = null) => {
  try {
    console.log(`🔍 [REPOSITORY] Fetching "other" option responses for survey: ${surveyId}`); // Debugging log
    
    // Buscar informações da survey
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    
    let surveyQuestions = [];
    try {
      surveyQuestions = typeof survey.questions === 'string' 
        ? JSON.parse(survey.questions) 
        : survey.questions;
    } catch (e) {
      console.error('❌ [REPOSITORY] Error parsing survey questions:', e.message);
    }
    
    // Filtrar questões que têm opção "outros"
    const questionsWithOtherOption = surveyQuestions.filter(q => 
      q.type === 'multiple' && q.otherOption === true
    );
    
    if (questionsWithOtherOption.length === 0) {
      console.log('ℹ️ [REPOSITORY] No questions with "other" option found in this survey');
      return [];
    }
    
    // Se questionId for fornecido, filtrar apenas essa questão
    const targetQuestions = questionId 
      ? questionsWithOtherOption.filter(q => q.questionId === questionId)
      : questionsWithOtherOption;
    
    if (targetQuestions.length === 0) {
      console.log(`ℹ️ [REPOSITORY] Question ${questionId} not found or doesn't have "other" option`);
      return [];
    }
    
    console.log(`📋 [REPOSITORY] Analyzing ${targetQuestions.length} question(s) with "other" option`);
    
    // Buscar todas as respostas para estas questões
    const questionTexts = targetQuestions.map(q => q.question);
    const responses = await Result.findAll({
      where: { 
        surveyId,
        question: { [Op.in]: questionTexts }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'gender', 'age']
      }]
    });
    
    // Processar respostas com "outros"
    const otherResponses = [];
    
    responses.forEach(r => {
      const responseData = r.toJSON ? r.toJSON() : r;
      const questionData = targetQuestions.find(q => q.question === responseData.question);
      
      if (!questionData) return;
      
      // Parse answer
      let parsedAnswer = responseData.answer;
      if (typeof parsedAnswer === 'string') {
        try {
          parsedAnswer = JSON.parse(parsedAnswer);
        } catch (e) {
          // Não é JSON
        }
      }
      
      // Verificar se é resposta com "outros"
      if (typeof parsedAnswer === 'object' && parsedAnswer.otherText) {
        otherResponses.push({
          responseId: responseData.id,
          questionId: questionData.questionId,
          question: responseData.question,
          otherOptionText: questionData.otherOptionText || 'Outro (especifique)',
          otherText: parsedAnswer.otherText,
          selectedOptions: parsedAnswer.selectedOptions || [parsedAnswer.selectedOption],
          user: responseData.user,
          createdAt: responseData.createdAt
        });
      }
      // Verificar formato legado
      else if (typeof responseData.answer === 'string' && responseData.answer.includes('Outro: ')) {
        const otherText = responseData.answer.split('Outro: ')[1] || '';
        otherResponses.push({
          responseId: responseData.id,
          questionId: questionData.questionId,
          question: responseData.question,
          otherOptionText: 'Outro (especifique)',
          otherText: otherText,
          selectedOptions: [],
          user: responseData.user,
          createdAt: responseData.createdAt
        });
      }
    });
    
    console.log(`✅ [REPOSITORY] Found ${otherResponses.length} "other" option responses`);
    
    // Agrupar por texto similar
    const groupedByText = otherResponses.reduce((acc, response) => {
      const key = response.otherText.toLowerCase().trim();
      if (!acc[key]) {
        acc[key] = {
          text: response.otherText,
          count: 0,
          responses: []
        };
      }
      acc[key].count++;
      acc[key].responses.push(response);
      return acc;
    }, {});
    
    // Converter para array ordenado
    const groupedArray = Object.values(groupedByText)
      .sort((a, b) => b.count - a.count)
      .map(group => ({
        text: group.text,
        count: group.count,
        sampleResponses: group.responses.slice(0, 3) // Amostra para análise
      }));
    
    return {
      totalOtherResponses: otherResponses.length,
      questionsAnalyzed: targetQuestions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        otherOptionText: q.otherOptionText
      })),
      groupedResponses: groupedArray,
      rawOtherResponses: otherResponses.slice(0, 20) // Limitar para performance
    };
    
  } catch (error) {
    console.error('❌ [REPOSITORY] Error fetching "other" option responses:', error.message);
    throw new Error('Error fetching "other" option responses: ' + error.message);
  }
};

// Exporting all repository functions to be used by the service layer
const resultsRepository = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  getSurveyResponsesWithUserDetails,
  getOtherOptionResponses, // Nova função
  parseAnswerWithOtherOption // Exportar helper para uso externo
};

export default resultsRepository;
