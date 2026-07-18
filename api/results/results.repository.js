// Entry point for the results data-access layer.
//
// Split by responsibility, one file per concern, following the
// `results.repository.<concern>.js` naming convention:
//   - results.repository.questions.util.js    -> survey question metadata lookup
//   - results.repository.answer.util.js       -> raw answer normalization
//   - results.repository.write.js             -> saveResponse
//   - results.repository.survey-query.js      -> getResponsesBySurvey
//   - results.repository.question-query.js    -> getResponsesByQuestion
//   - results.repository.user-query.js        -> getUserResponses
//   - results.repository.detailed-query.js    -> getSurveyResponsesWithUserDetails
//   - results.repository.other-option.service.js -> getOtherOptionResponses
//
// Kept as the single import surface so results.service.js doesn't need to
// know how the repository is internally organized.

import { saveResponse } from './results.repository.write.js';
import { getResponsesBySurvey } from './results.repository.survey-query.js';
import { getResponsesByQuestion } from './results.repository.question-query.js';
import { getUserResponses } from './results.repository.user-query.js';
import { getSurveyResponsesWithUserDetails } from './results.repository.detailed-query.js';
import { getOtherOptionResponses } from './results.repository.other-option.service.js';
import { parseAnswerWithOtherOption } from './results.repository.answer.util.js';

export {
  saveResponse,
  getResponsesBySurvey,
  getResponsesByQuestion,
  getUserResponses,
  getSurveyResponsesWithUserDetails,
  getOtherOptionResponses,
  parseAnswerWithOtherOption
};

const resultsRepository = {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  getSurveyResponsesWithUserDetails,
  getOtherOptionResponses,
  parseAnswerWithOtherOption
};

export default resultsRepository;
