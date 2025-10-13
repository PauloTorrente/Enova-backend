// Initialize analytics structure with basic stats
export const initializeAnalytics = (survey, results) => {
  return {
    basicStats: {
      totalResponses: results.length,
      surveyTitle: survey.title,
      createdAt: survey.createdAt,
      expirationTime: survey.expirationTime,
      status: survey.status,
      responseLimit: survey.responseLimit,
      completionRate: survey.responseLimit ? 
        Math.min(100, Math.round((results.length / survey.responseLimit) * 100)) : null
    },
    
    // General demographic overview
    demographicOverview: {
      byGender: {},
      byAgeGroup: { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 },
      byCity: {},
      byResidentialArea: {},
      byEducationLevel: {},
      byPurchaseResponsibility: {},
      byChildrenCount: { '0': 0, '1': 0, '2': 0, '3+': 0 },
      walletBalanceRanges: { '0-100': 0, '101-500': 0, '501-1000': 0, '1000+': 0 },
      scoreRanges: { '0-100': 0, '101-500': 0, '501-1000': 0, '1000+': 0 }
    },
    questionAnalytics: []
  };
};

// Process general demographic data from results
export const processDemographicData = (analytics, results) => {
  results.forEach(result => {
    const user = result.user;
    if (!user) return;
    
    // Process gender data
    if (user.gender) {
      analytics.demographicOverview.byGender[user.gender] = 
        (analytics.demographicOverview.byGender[user.gender] || 0) + 1;
    }
    
    // Process age group data
    if (user.age) {
      if (user.age >= 18 && user.age <= 25) analytics.demographicOverview.byAgeGroup['18-25']++;
      else if (user.age >= 26 && user.age <= 35) analytics.demographicOverview.byAgeGroup['26-35']++;
      else if (user.age >= 36 && user.age <= 45) analytics.demographicOverview.byAgeGroup['36-45']++;
      else if (user.age >= 46 && user.age <= 55) analytics.demographicOverview.byAgeGroup['46-55']++;
      else if (user.age > 55) analytics.demographicOverview.byAgeGroup['56+']++;
    }
    
    // Process city data
    if (user.city) {
      analytics.demographicOverview.byCity[user.city] = 
        (analytics.demographicOverview.byCity[user.city] || 0) + 1;
    }
    
    // Process residential area data
    if (user.residentialArea) {
      analytics.demographicOverview.byResidentialArea[user.residentialArea] = 
        (analytics.demographicOverview.byResidentialArea[user.residentialArea] || 0) + 1;
    }
    
    // Process education level data
    if (user.educationLevel) {
      analytics.demographicOverview.byEducationLevel[user.educationLevel] = 
        (analytics.demographicOverview.byEducationLevel[user.educationLevel] || 0) + 1;
    }
    
    // Process purchase responsibility data
    if (user.purchaseResponsibility) {
      analytics.demographicOverview.byPurchaseResponsibility[user.purchaseResponsibility] = 
        (analytics.demographicOverview.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
    }
    
    // Process children count data
    if (user.childrenCount !== null && user.childrenCount !== undefined) {
      if (user.childrenCount === 0) analytics.demographicOverview.byChildrenCount['0']++;
      else if (user.childrenCount === 1) analytics.demographicOverview.byChildrenCount['1']++;
      else if (user.childrenCount === 2) analytics.demographicOverview.byChildrenCount['2']++;
      else analytics.demographicOverview.byChildrenCount['3+']++;
    }
    
    // Process wallet balance data
    if (user.walletBalance !== null && user.walletBalance !== undefined) {
      if (user.walletBalance <= 100) analytics.demographicOverview.walletBalanceRanges['0-100']++;
      else if (user.walletBalance <= 500) analytics.demographicOverview.walletBalanceRanges['101-500']++;
      else if (user.walletBalance <= 1000) analytics.demographicOverview.walletBalanceRanges['501-1000']++;
      else analytics.demographicOverview.walletBalanceRanges['1000+']++;
    }
    
    // Process score data
    if (user.score !== null && user.score !== undefined) {
      if (user.score <= 100) analytics.demographicOverview.scoreRanges['0-100']++;
      else if (user.score <= 500) analytics.demographicOverview.scoreRanges['101-500']++;
      else if (user.score <= 1000) analytics.demographicOverview.scoreRanges['501-1000']++;
      else analytics.demographicOverview.scoreRanges['1000+']++;
    }
  });
};

// Process multiple choice question analytics
const processMultipleChoiceQuestion = (question, questionResults) => {
  const questionData = {
    questionId: question.questionId,
    question: question.question,
    type: question.type,
    totalAnswers: questionResults.length,
    options: {},
    demographicBreakdown: {
      byGender: {}, byAgeGroup: {}, byCity: {}, 
      byEducationLevel: {}, byPurchaseResponsibility: {}
    }
  };

  question.options.forEach(option => {
    questionData.options[option] = {
      count: 0,
      demographics: {
        byGender: {}, byAgeGroup: {}, byCity: {}, 
        byEducationLevel: {}, byPurchaseResponsibility: {}
      }
    };

    const optionResponses = questionResults.filter(r => {
      const answer = r.answer;
      if (Array.isArray(answer)) {
        return answer.includes(option);
      }
      return answer === option;
    });

    questionData.options[option].count = optionResponses.length;

    // Process demographics for each option
    optionResponses.forEach(r => {
      const user = r.user;
      if (!user) return;

      // Process gender demographics
      if (user.gender) {
        questionData.options[option].demographics.byGender[user.gender] = 
          (questionData.options[option].demographics.byGender[user.gender] || 0) + 1;
      }

      // Process age group demographics
      if (user.age) {
        let ageGroup = '56+';
        if (user.age <= 25) ageGroup = '18-25';
        else if (user.age <= 35) ageGroup = '26-35';
        else if (user.age <= 45) ageGroup = '36-45';
        else if (user.age <= 55) ageGroup = '46-55';
        
        questionData.options[option].demographics.byAgeGroup[ageGroup] = 
          (questionData.options[option].demographics.byAgeGroup[ageGroup] || 0) + 1;
      }

      // Process city demographics
      if (user.city) {
        questionData.options[option].demographics.byCity[user.city] = 
          (questionData.options[option].demographics.byCity[user.city] || 0) + 1;
      }

      // Process education level demographics
      if (user.educationLevel) {
        questionData.options[option].demographics.byEducationLevel[user.educationLevel] = 
          (questionData.options[option].demographics.byEducationLevel[user.educationLevel] || 0) + 1;
      }

      // Process purchase responsibility demographics
      if (user.purchaseResponsibility) {
        questionData.options[option].demographics.byPurchaseResponsibility[user.purchaseResponsibility] = 
          (questionData.options[option].demographics.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
      }
    });
  });

  return questionData;
};

// Process open-ended question analytics
const processOpenEndedQuestion = (question, questionResults) => {
  const questionData = {
    questionId: question.questionId,
    question: question.question,
    type: question.type,
    totalAnswers: questionResults.length,
    options: {},
    demographicBreakdown: {
      byGender: {}, byAgeGroup: {}, byCity: {}, 
      byEducationLevel: {}, byPurchaseResponsibility: {}
    }
  };

  const answerGroups = {};
  questionResults.forEach(r => {
    const answer = r.answer || '';
    const key = answer.substring(0, 50).toLowerCase();
    if (!answerGroups[key]) {
      answerGroups[key] = {
        count: 0,
        examples: [],
        demographics: { byGender: {}, byAgeGroup: {}, byCity: {} }
      };
    }
    
    answerGroups[key].count++;
    if (answerGroups[key].examples.length < 3) {
      answerGroups[key].examples.push(answer);
    }

    // Process demographics for open answers
    const user = r.user;
    if (user) {
      if (user.gender) {
        answerGroups[key].demographics.byGender[user.gender] = 
          (answerGroups[key].demographics.byGender[user.gender] || 0) + 1;
      }

      if (user.age) {
        let ageGroup = '56+';
        if (user.age <= 25) ageGroup = '18-25';
        else if (user.age <= 35) ageGroup = '26-35';
        else if (user.age <= 45) ageGroup = '36-45';
        else if (user.age <= 55) ageGroup = '46-55';
        
        answerGroups[key].demographics.byAgeGroup[ageGroup] = 
          (answerGroups[key].demographics.byAgeGroup[ageGroup] || 0) + 1;
      }

      if (user.city) {
        answerGroups[key].demographics.byCity[user.city] = 
          (answerGroups[key].demographics.byCity[user.city] || 0) + 1;
      }
    }
  });
  
  questionData.answerGroups = answerGroups;
  return questionData;
};

// Process question analytics with demographic segmentation
export const processQuestionAnalytics = (survey, results, analytics) => {
  if (!survey.questions) return;

  const questions = typeof survey.questions === 'string' 
    ? JSON.parse(survey.questions) 
    : survey.questions;

  analytics.questionAnalytics = questions.map(question => {
    const questionResults = results.filter(r => 
      r.question && (r.question.includes(question.question) || 
      r.questionId === question.questionId)
    );

    if (question.type === 'multiple' && question.options) {
      return processMultipleChoiceQuestion(question, questionResults);
    } else {
      return processOpenEndedQuestion(question, questionResults);
    }
  });
};
