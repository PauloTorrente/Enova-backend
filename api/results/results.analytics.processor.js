// Entry point for survey analytics processing.
//
// This file used to hold every analytics helper in one 400+ line module.
// It has since been split by responsibility, one file per concern, all
// following the `results.analytics.<concern>.<role>.js` naming convention:
//   - results.analytics.age-group.util.js        -> shared age bucketing
//   - results.analytics.answer.util.js            -> raw answer normalization
//   - results.analytics.demographics.processor.js -> survey-wide overview
//   - results.analytics.demographics.helpers.js   -> per-option/-question tallies
//   - results.analytics.choice.processor.js       -> multiple-choice questions
//   - results.analytics.openended.processor.js    -> free-text questions
//
// Kept as the single import surface so callers (e.g. results.analytics.core.service.js)
// don't need to know how analytics processing is internally organized.

import { initializeAnalytics, processDemographicData } from './results.analytics.demographics.processor.js';
import { processOptionDemographics, processQuestionDemographics } from './results.analytics.demographics.helpers.js';
import { extractAnswerValue } from './results.analytics.answer.util.js';
import { processMultipleChoiceQuestion } from './results.analytics.choice.processor.js';
import { processOpenEndedQuestion } from './results.analytics.openended.processor.js';

// Routes each question to the right processor (multiple-choice vs
// open-ended) and attaches the per-question analytics to `analytics`.
// Mutates `analytics` in place, matching the other processors in this module.
export const processQuestionAnalytics = (survey, results, analytics) => {
  if (!survey.questions) return;

  let questions;
  try {
    questions = typeof survey.questions === 'string'
      ? JSON.parse(survey.questions)
      : survey.questions;
  } catch (error) {
    // Malformed question JSON would otherwise crash the whole analytics
    // response for a survey that may still have valid demographic data.
    // Log enough to find the bad record without dumping response content.
    console.error(`[results.analytics.processor] Failed to parse questions JSON for survey ${survey.id}:`, error.message);
    analytics.questionAnalytics = [];
    return;
  }

  analytics.questionAnalytics = questions.map((question) => {
    const questionResults = results.filter((r) =>
      r.question && (r.question.includes(question.question) || r.questionId === question.questionId)
    );

    if (question.type === 'multiple' && question.options) {
      return processMultipleChoiceQuestion(question, questionResults);
    }
    return processOpenEndedQuestion(question, questionResults);
  });
};

// Re-export the full public API so existing imports of this file keep
// working unchanged after the split.
export { initializeAnalytics, processDemographicData };
export { extractAnswerValue, processOptionDemographics, processQuestionDemographics };
