import * as resultsService from './results.service.js';
import Survey from '../surveys/surveys.model.js';

/**
 * Verifies if the client has access to the specified survey
 * @param {number} surveyId - The ID of the survey to check
 * @param {number} clientId - The ID of the client making the request
 * @returns {Promise<Survey>} The survey if access is granted
 * @throws {Error} If survey not found or access denied
 */
const verifyClientAccess = async (surveyId, clientId) => {
  // Find the survey by its primary key
  const survey = await Survey.findByPk(surveyId);
  
  // Check if survey exists
  if (!survey) {
    throw new Error('Survey not found');
  }
  
  // Verify the survey belongs to the requesting client
  if (survey.clientId !== clientId) {
    throw new Error('Access denied to this survey');
  }
  
  return survey;
};

/**
 * Controller to get all responses for a specific survey
 * (Only accessible to the client who owns the survey)
 */
export const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    // Validate survey ID was provided
    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID required' });
    }
    
    // Verify client has access to this survey
    await verifyClientAccess(surveyId, req.client?.id);

    // Fetch responses from service layer
    const responses = await resultsService.getResponsesBySurvey(surveyId);
    
    // Handle case where no responses exist
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    // Return successful response with data
    return res.status(200).json({
      message: 'Responses fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    // Determine appropriate status code based on error type
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      message: error.message,
      error: error.message, // In production, you might not want to expose raw errors
    });
  }
};

//Controller to get responses for a specific question within a survey (Only accessible to the client who owns the survey)

export const getResponsesByQuestion = async (req, res) => {
  try {
    const { surveyId, question } = req.params;
    
    // Verify client access first
    await verifyClientAccess(surveyId, req.client?.id);

    // Fetch question-specific responses
    const responses = await resultsService.getResponsesByQuestion(surveyId, question);
    
    // Handle empty responses
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this question.' });
    }

    return res.status(200).json({
      message: 'Responses for the question fetched successfully!',
      responses: responses,
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      message: error.message,
      error: error.message,
    });
  }
};

//Controller to get detailed survey responses with user demographic information (Only accessible to the client who owns the survey)

export const getSurveyResponsesWithUserDetails = async (req, res) => {
  const { surveyId } = req.params;
  
  try {
    // Verify access before proceeding
    await verifyClientAccess(surveyId, req.client?.id);
    
    // Get responses with associated user data
    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    
    // Handle no responses case
    if (!responses || responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    // Format the response data to include only necessary user information
    const formatted = responses.map(r => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      user: r.user ? {
        id: r.user.id,
        name: `${r.user.firstName} ${r.user.lastName}`,
        email: r.user.email,
        city: r.user.city,
        area: r.user.residentialArea,
        gender: r.user.gender,
        age: r.user.age
      } : null
    }));

    // Return formatted data
    res.status(200).json({
      message: 'Responses with user details fetched successfully!',
      responses: formatted
    });
  } catch (error) {
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({ 
      message: error.message,
      error: error.message
    });
  }
};
