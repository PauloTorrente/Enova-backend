import Result from './results.model.js';
import { parseAnswerWithOtherOption } from './results.repository.answer.util.js';

// Fetches every response submitted by one user, across all surveys.
export const getUserResponses = async (userId) => {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    const responses = await Result.findAll({
      where: { userId },
      raw: true
    });

    return responses.map((r) => ({
      ...r,
      answer: parseAnswerWithOtherOption(r.answer)
    }));
  } catch (error) {
    console.error(`[results.repository.user-query] getUserResponses failed (userId=${userId}):`, error.message);
    throw new Error('Error fetching responses for user: ' + error.message);
  }
};
