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

// Helper function to extract answer value for analytics
const extractAnswerValue = (answer) => {
  // Se a resposta for um objeto com "other" option
  if (typeof answer === 'object' && answer !== null) {
    // Para múltipla seleção com "outros"
    if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
      // Verificar se inclui "other"
      if (answer.selectedOptions.includes('other') && answer.otherText) {
        const otherOption = `Outro: ${answer.otherText}`;
        const otherOptions = answer.selectedOptions.filter(opt => opt !== 'other');
        return [...otherOptions, otherOption];
      }
      return answer.selectedOptions;
    }
    // Para seleção única com "outros"
    else if (answer.selectedOption === 'other' && answer.otherText) {
      return `Outro: ${answer.otherText}`;
    }
    // Para seleção única regular
    else if (answer.selectedOption) {
      return answer.selectedOption;
    }
  }
  
  // Se for string que já contém "Outro: "
  if (typeof answer === 'string' && answer.startsWith('Outro: ')) {
    return answer;
  }
  
  // Para respostas normais (array ou string)
  return answer;
};

// Process multiple choice question analytics with "other" option support
const processMultipleChoiceQuestion = (question, questionResults) => {
  const questionData = {
    questionId: question.questionId,
    question: question.question,
    type: question.type,
    multipleSelections: question.multipleSelections || 'no',
    hasOtherOption: question.otherOption || false,
    otherOptionText: question.otherOptionText || 'Outro (especifique)',
    totalAnswers: questionResults.length,
    options: {},
    otherResponses: [], 
    demographicBreakdown: {
      byGender: {}, byAgeGroup: {}, byCity: {}, 
      byEducationLevel: {}, byPurchaseResponsibility: {}
    }
  };

  // Inicializar contadores para cada opção (incluindo "outro")
  question.options.forEach(option => {
    questionData.options[option] = {
      count: 0,
      demographics: {
        byGender: {}, byAgeGroup: {}, byCity: {}, 
        byEducationLevel: {}, byPurchaseResponsibility: {}
      }
    };
  });

  // Adicionar opção "outro" se existir
  if (questionData.hasOtherOption) {
    questionData.options[questionData.otherOptionText] = {
      count: 0,
      isOtherOption: true,
      demographics: {
        byGender: {}, byAgeGroup: {}, byCity: {}, 
        byEducationLevel: {}, byPurchaseResponsibility: {}
      }
    };
  }

  // Processar cada resposta
  questionResults.forEach(r => {
    const answer = r.answer;
    const user = r.user;
    
    // Extrair valor da resposta (lidando com formato "outros")
    const answerValue = extractAnswerValue(answer);
    
    // Para múltipla seleção (array)
    if (Array.isArray(answerValue)) {
      answerValue.forEach(option => {
        // Verificar se é uma resposta de "outro"
        const isOtherResponse = option.startsWith('Outro: ');
        const optionKey = isOtherResponse ? questionData.otherOptionText : option;
        
        // Incrementar contador se a opção existe
        if (questionData.options[optionKey]) {
          questionData.options[optionKey].count++;
          
          // Processar demografia para esta opção
          if (user) {
            processOptionDemographics(questionData.options[optionKey], user);
          }
          
          // Armazenar texto de "outro" se aplicável
          if (isOtherResponse && questionData.hasOtherOption) {
            const otherText = option.replace('Outro: ', '');
            questionData.otherResponses.push({
              userId: r.userId,
              otherText: otherText,
              otherOptions: answerValue.filter(opt => !opt.startsWith('Outro: ')),
              timestamp: r.createdAt,
              userInfo: user ? {
                name: `${user.firstName} ${user.lastName}`,
                gender: user.gender,
                age: user.age,
                city: user.city
              } : null
            });
          }
        }
      });
    } 
    // Para seleção única (string)
    else if (typeof answerValue === 'string') {
      // Verificar se é uma resposta de "outro"
      const isOtherResponse = answerValue.startsWith('Outro: ');
      const optionKey = isOtherResponse ? questionData.otherOptionText : answerValue;
      
      // Incrementar contador se a opção existe
      if (questionData.options[optionKey]) {
        questionData.options[optionKey].count++;
        
        // Processar demografia para esta opção
        if (user) {
          processOptionDemographics(questionData.options[optionKey], user);
        }
        
        // Armazenar texto de "outro" se aplicável
        if (isOtherResponse && questionData.hasOtherOption) {
          const otherText = answerValue.replace('Outro: ', '');
          questionData.otherResponses.push({
            userId: r.userId,
            otherText: otherText,
            timestamp: r.createdAt,
            userInfo: user ? {
              name: `${user.firstName} ${user.lastName}`,
              gender: user.gender,
              age: user.age,
              city: user.city
            } : null
          });
        }
      }
    }
    
    // Processar demografia geral para a questão
    if (user) {
      processQuestionDemographics(questionData.demographicBreakdown, user);
    }
  });

  return questionData;
};

// Helper function to process demographics for a specific option
const processOptionDemographics = (optionData, user) => {
  // Process gender demographics
  if (user.gender) {
    optionData.demographics.byGender[user.gender] = 
      (optionData.demographics.byGender[user.gender] || 0) + 1;
  }

  // Process age group demographics
  if (user.age) {
    let ageGroup = '56+';
    if (user.age <= 25) ageGroup = '18-25';
    else if (user.age <= 35) ageGroup = '26-35';
    else if (user.age <= 45) ageGroup = '36-45';
    else if (user.age <= 55) ageGroup = '46-55';
    
    optionData.demographics.byAgeGroup[ageGroup] = 
      (optionData.demographics.byAgeGroup[ageGroup] || 0) + 1;
  }

  // Process city demographics
  if (user.city) {
    optionData.demographics.byCity[user.city] = 
      (optionData.demographics.byCity[user.city] || 0) + 1;
  }

  // Process education level demographics
  if (user.educationLevel) {
    optionData.demographics.byEducationLevel[user.educationLevel] = 
      (optionData.demographics.byEducationLevel[user.educationLevel] || 0) + 1;
  }

  // Process purchase responsibility demographics
  if (user.purchaseResponsibility) {
    optionData.demographics.byPurchaseResponsibility[user.purchaseResponsibility] = 
      (optionData.demographics.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
  }
};

// Helper function to process overall question demographics
const processQuestionDemographics = (demographicBreakdown, user) => {
  // Process gender demographics
  if (user.gender) {
    demographicBreakdown.byGender[user.gender] = 
      (demographicBreakdown.byGender[user.gender] || 0) + 1;
  }

  // Process age group demographics
  if (user.age) {
    let ageGroup = '56+';
    if (user.age <= 25) ageGroup = '18-25';
    else if (user.age <= 35) ageGroup = '26-35';
    else if (user.age <= 45) ageGroup = '36-45';
    else if (user.age <= 55) ageGroup = '46-55';
    
    demographicBreakdown.byAgeGroup[ageGroup] = 
      (demographicBreakdown.byAgeGroup[ageGroup] || 0) + 1;
  }

  // Process city demographics
  if (user.city) {
    demographicBreakdown.byCity[user.city] = 
      (demographicBreakdown.byCity[user.city] || 0) + 1;
  }

  // Process education level demographics
  if (user.educationLevel) {
    demographicBreakdown.byEducationLevel[user.educationLevel] = 
      (demographicBreakdown.byEducationLevel[user.educationLevel] || 0) + 1;
  }

  // Process purchase responsibility demographics
  if (user.purchaseResponsibility) {
    demographicBreakdown.byPurchaseResponsibility[user.purchaseResponsibility] = 
      (demographicBreakdown.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
  }
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

// Export helper functions for testing
export { 
  extractAnswerValue, 
  processOptionDemographics, 
  processQuestionDemographics 
};
