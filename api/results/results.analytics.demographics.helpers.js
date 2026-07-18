import { getAgeGroup } from './results.analytics.age-group.util.js';

// Demographic tally helpers shared by the multiple-choice and open-ended
// question processors. Kept separate from
// results.analytics.demographics.processor.js because these operate on a
// per-option / per-question slice of data, not the survey-wide overview.

// Increments demographic counters for a single answer option
// (e.g. "how many 26-35 year-olds picked this option").
export const processOptionDemographics = (optionData, user) => {
  const demographics = optionData.demographics;

  if (user.gender) {
    demographics.byGender[user.gender] = (demographics.byGender[user.gender] || 0) + 1;
  }

  if (user.age) {
    const ageGroup = getAgeGroup(user.age);
    demographics.byAgeGroup[ageGroup] = (demographics.byAgeGroup[ageGroup] || 0) + 1;
  }

  if (user.city) {
    demographics.byCity[user.city] = (demographics.byCity[user.city] || 0) + 1;
  }

  if (user.educationLevel) {
    demographics.byEducationLevel[user.educationLevel] =
      (demographics.byEducationLevel[user.educationLevel] || 0) + 1;
  }

  if (user.purchaseResponsibility) {
    demographics.byPurchaseResponsibility[user.purchaseResponsibility] =
      (demographics.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
  }
};

// Same as processOptionDemographics, but for the question-wide breakdown
// (i.e. across every respondent to a question, not just one option).
export const processQuestionDemographics = (demographicBreakdown, user) => {
  if (user.gender) {
    demographicBreakdown.byGender[user.gender] =
      (demographicBreakdown.byGender[user.gender] || 0) + 1;
  }

  if (user.age) {
    const ageGroup = getAgeGroup(user.age);
    demographicBreakdown.byAgeGroup[ageGroup] =
      (demographicBreakdown.byAgeGroup[ageGroup] || 0) + 1;
  }

  if (user.city) {
    demographicBreakdown.byCity[user.city] = (demographicBreakdown.byCity[user.city] || 0) + 1;
  }

  if (user.educationLevel) {
    demographicBreakdown.byEducationLevel[user.educationLevel] =
      (demographicBreakdown.byEducationLevel[user.educationLevel] || 0) + 1;
  }

  if (user.purchaseResponsibility) {
    demographicBreakdown.byPurchaseResponsibility[user.purchaseResponsibility] =
      (demographicBreakdown.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
  }
};
