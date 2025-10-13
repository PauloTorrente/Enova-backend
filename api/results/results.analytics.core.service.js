import Result from './results.model.js';
import User from '../users/users.model.js';
import { initializeAnalytics, processDemographicData, processQuestionAnalytics } from './results.analytics.processor.js';

// Main function to process survey analytics
export const processSurveyAnalytics = async (survey) => {
  // Get all responses with user demographic data
  const results = await Result.findAll({
    where: { surveyId: survey.id },
    include: [{
      model: User,
      as: 'user',
      attributes: [
        'id', 'firstName', 'lastName', 'age', 'city', 'gender', 
        'residentialArea', 'educationLevel', 'purchaseResponsibility',
        'childrenCount', 'walletBalance', 'score'
      ]
    }]
  });

  console.log(`📈 Found ${results.length} responses`);

  // Initialize analytics structure
  const analytics = initializeAnalytics(survey, results);
  
  // Process demographic data
  processDemographicData(analytics, results);
  
  // Process question analytics
  processQuestionAnalytics(survey, results, analytics);

  console.log(`✅ Analytics processed successfully`);
  
  // Return formatted response
  return formatAnalyticsResponse(analytics, results);
};

// Format final response data
const formatAnalyticsResponse = (analytics, results) => {
  return {
    success: true,
    analytics,
    summary: {
      totalRespondents: results.length,
      demographicSummary: {
        topGender: Object.keys(analytics.demographicOverview.byGender).reduce((a, b) => 
          analytics.demographicOverview.byGender[a] > analytics.demographicOverview.byGender[b] ? a : b, 'N/A'),
        topAgeGroup: Object.keys(analytics.demographicOverview.byAgeGroup).reduce((a, b) => 
          analytics.demographicOverview.byAgeGroup[a] > analytics.demographicOverview.byAgeGroup[b] ? a : b, 'N/A'),
        topCity: Object.keys(analytics.demographicOverview.byCity).reduce((a, b) => 
          analytics.demographicOverview.byCity[a] > analytics.demographicOverview.byCity[b] ? a : b, 'N/A')
      }
    },
    rawResults: results.map(r => ({
      id: r.id,
      userId: r.userId,
      question: r.question,
      answer: r.answer,
      createdAt: r.createdAt,
      user: r.user ? {
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        age: r.user.age,
        city: r.user.city,
        gender: r.user.gender,
        residentialArea: r.user.residentialArea,
        educationLevel: r.user.educationLevel,
        purchaseResponsibility: r.user.purchaseResponsibility,
        childrenCount: r.user.childrenCount,
        walletBalance: r.user.walletBalance,
        score: r.user.score
      } : null
    }))
  };
};
