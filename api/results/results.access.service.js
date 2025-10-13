import Survey from '../surveys/surveys.model.js';

// Check if client can access this survey
export const verifyClientAccess = async (surveyId, clientId) => {
  const survey = await Survey.findByPk(surveyId);
  
  if (!survey) {
    throw new Error('Survey not found');
  }
  
  if (survey.clientId !== clientId) {
    throw new Error('Access denied to this survey');
  }
  
  return survey;
};
