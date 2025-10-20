import { Op } from 'sequelize';
import Result from './results.model.js'; // Importing the Result model to interact with the database
import User from '../users/users.model.js';

// Function to save a response to the database
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
    console.log('Starting saveResponse...'); // Debugging log
    console.log(`surveyId: ${surveyId}, userId: ${userId}, surveyTitle: ${surveyTitle}, question: ${question}, answer: ${answer}`); // Debugging log

    // Check if all required fields are provided
    if (!surveyId || !userId || !surveyTitle || !question || !answer) {
      throw new Error('All fields (surveyId, userId, surveyTitle, question, and answer) are required');
    }

    // For multiple-choice questions that allow multiple selections, we need to handle array answers
    const formattedAnswer = Array.isArray(answer) ? JSON.stringify(answer) : answer;

    // Creating a new response entry in the Result model
    const newResult = await Result.create({
      surveyId, // Linking the response to the survey
      userId, // Linking the response to the user
      surveyTitle, // Storing the survey title
      question, // The specific question being answered
      answer: formattedAnswer, // The answer provided by the user (could be string or stringified array)
    });

    console.log('Response saved successfully:', newResult); // Debugging log
    return newResult; // Returning the saved result entry
  } catch (error) {
    console.error('Error in saveResponse:', error.message); // Debugging log
    throw new Error('Error saving response to the database: ' + error.message);
  }
};

// Function to get all responses for a specific survey
export const getResponsesBySurvey = async (surveyId) => {
  try {
    console.log('Starting getResponsesBySurvey...'); // Debugging log
    console.log(`surveyId: ${surveyId}`); // Debugging log

    // Ensure surveyId is provided
    if (!surveyId) {
      throw new Error('surveyId is required');
    }

    // Fetching all responses for the specific survey from the Result model
    const responses = await Result.findAll({
      where: {
        surveyId, // Only get results that match the specific survey
      },
      raw: true // Get plain objects instead of model instances
    });

    // Parse JSON answers back to arrays if they were stringified
    const parsedResponses = responses.map(r => ({
      ...r,
      answer: typeof r.answer === 'string' && r.answer.startsWith('[') ? JSON.parse(r.answer) : r.answer
    }));

    console.log(`Found ${parsedResponses.length} responses for surveyId: ${surveyId}`); // Debugging log
    return parsedResponses; // Returning the list of responses
  } catch (error) {
    console.error('Error in getResponsesBySurvey:', error.message); // Debugging log
    throw new Error('Error fetching responses for survey: ' + error.message);
  }
};

// Function to get all responses for a specific user
export const getUserResponses = async (userId) => {
  try {
    console.log('Starting getUserResponses...'); // Debugging log
    console.log(`userId: ${userId}`); // Debugging log

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

    // Parse JSON answers back to arrays if they were stringified
    const parsedResponses = responses.map(r => ({
      ...r,
      answer: typeof r.answer === 'string' && r.answer.startsWith('[') ? JSON.parse(r.answer) : r.answer
    }));

    console.log(`Found ${parsedResponses.length} responses for userId: ${userId}`); // Debugging log
    return parsedResponses; // Returning the list of user responses
  } catch (error) {
    console.error('Error in getUserResponses:', error.message); // Debugging log
    throw new Error('Error fetching responses for user: ' + error.message);
  }
};

// Function to get all responses for a specific question in a survey
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    console.log('Starting getResponsesByQuestion...'); // Debugging log
    console.log(`surveyId: ${surveyId}, question: ${question}`); // Debugging log

    // Ensure surveyId and question are provided
    if (!surveyId || !question) {
      throw new Error('surveyId and question are required');
    }

    // Fetching all responses for a specific question in a survey
    const responses = await Result.findAll({
      where: {
        surveyId, // The survey to which the question belongs
        question, // The specific question being answered
      },
      raw: true // Get plain objects instead of model instances
    });

    // Parse JSON answers back to arrays if they were stringified
    const parsedResponses = responses.map(r => ({
      ...r,
      answer: typeof r.answer === 'string' && r.answer.startsWith('[') ? JSON.parse(r.answer) : r.answer
    }));

    console.log(`Found ${parsedResponses.length} responses for surveyId: ${surveyId}, question: ${question}`); // Debugging log
    return parsedResponses; // Returning the list of responses for the specific question
  } catch (error) {
    console.error('Error in getResponsesByQuestion:', error.message); // Debugging log
    throw new Error('Error fetching responses for question: ' + error.message);
  }
};

// Function to get survey responses with associated user details - CORRIGIDO
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    console.log(`🔍 [REPOSITORY] Fetching responses with user details for survey: ${surveyId}`); // Debugging log
    
    // Fetch responses including user information - REMOVIDO raw: true para que as associações funcionem corretamente
    const responses = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User, // User model imported at the top
        as: 'user', // Association alias for proper mapping
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'residentialArea', 'gender', 'age'] // User fields to include
      }]
    });

    console.log(`✅ [REPOSITORY] Found ${responses.length} responses with user details`); // Debugging log

    // Convert to plain objects and parse answers - using toJSON() for proper instance conversion
    const parsedResponses = responses.map(r => {
      const responseData = r.toJSON ? r.toJSON() : r; // Convert Sequelize instance to plain object if needed
      
      return {
        ...responseData,
        answer: typeof responseData.answer === 'string' && responseData.answer.startsWith('[') 
          ? JSON.parse(responseData.answer) // Parse array answers back to arrays
          : responseData.answer // Keep other answer types as is
      };
    });

    // Debug: log first response to verify question field is populated
    if (parsedResponses.length > 0) {
      console.log('📋 [REPOSITORY] First response sample:', { // Debugging log
        id: parsedResponses[0].id,
        question: parsedResponses[0].question, // This should now be populated
        answer: parsedResponses[0].answer,
        hasUser: !!parsedResponses[0].user // Check if user data is included
      });
    }

    return parsedResponses; // Returning the list of responses with user details
  } catch (error) {
    console.error('❌ [REPOSITORY] Error fetching responses with user details:', error.message); // Debugging log
    console.error('🔍 [REPOSITORY] Error details:', error); // Debugging log
    throw new Error('Error fetching responses with user details: ' + error.message);
  }
};

// Exporting all repository functions to be used by the service layer
const resultsRepository = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  getSurveyResponsesWithUserDetails
};

export default resultsRepository;