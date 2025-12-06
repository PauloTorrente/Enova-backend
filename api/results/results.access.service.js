import Survey from '../surveys/surveys.model.js';

// Check if client can access this survey (for normal clients)
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

// Check if client can access this survey with admin privileges
// Client admin can access ALL surveys, normal clients can only access their own
export const verifyClientAccessWithPrivileges = async (surveyId, clientId, clientRole) => {
  const survey = await Survey.findByPk(surveyId);
  
  if (!survey) {
    throw new Error('Survey not found');
  }
  
  // If client is admin, grant access to ANY survey
  if (clientRole === 'client_admin') {
    console.log(`✅ [ACCESS] Admin access granted to survey ${surveyId}`);
    return survey;
  }
  
  // Normal clients can only access their own surveys
  if (survey.clientId !== clientId) {
    throw new Error('Access denied to this survey');
  }
  
  console.log(`✅ [ACCESS] Normal client access granted to own survey ${surveyId}`);
  return survey;
};

// Check if user can manage client resources (for admin operations)
export const verifyAdminPrivileges = async (clientId, clientRole) => {
  if (clientRole !== 'client_admin') {
    throw new Error('Admin privileges required for this operation');
  }
  
  console.log(`✅ [ADMIN] Admin privileges verified for client ${clientId}`);
  return true;
};
