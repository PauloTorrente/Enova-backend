import Result from './results.model.js';

// Persists a single survey answer. Array/object answers are stringified
// since the `answer` column stores whatever shape the question needs
// (plain text, single choice, or a multi-choice + "other" payload).
export const saveResponse = async (surveyId, userId, surveyTitle, question, answer) => {
  try {
    if (!surveyId || !userId || !surveyTitle || !question || answer === undefined) {
      throw new Error('All fields (surveyId, userId, surveyTitle, question, and answer) are required');
    }

    // "other" option payloads and multi-choice arrays are stored as JSON
    // strings; everything else is stored as the DB's native JSON value.
    let formattedAnswer = answer;
    if (typeof answer === 'object' && answer !== null && answer.otherText !== undefined) {
      formattedAnswer = JSON.stringify(answer);
    } else if (Array.isArray(answer)) {
      formattedAnswer = JSON.stringify(answer);
    }

    const newResult = await Result.create({
      surveyId,
      userId,
      surveyTitle,
      question,
      answer: formattedAnswer,
    });

    return newResult;
  } catch (error) {
    // Log identifying context only — never the answer content, which may
    // include free-text user input.
    console.error(`[results.repository.write] saveResponse failed (surveyId=${surveyId}, userId=${userId}):`, error.message);
    throw new Error('Error saving response to the database: ' + error.message);
  }
};
