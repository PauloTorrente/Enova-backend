// Normalizes raw answer payloads into a shape the question processors
// can count directly, regardless of how the client submitted them
// (single choice, multi choice, or a free-typed "other" value).

// Extracts a countable answer value from a raw result.answer payload.
// Handles the "other" option for both single- and multi-select questions
// by folding the free-text reply into a single "Outro: <text>" token.
export const extractAnswerValue = (answer) => {
  if (typeof answer === 'object' && answer !== null) {
    // Multi-select with an "other" option checked.
    if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
      if (answer.selectedOptions.includes('other') && answer.otherText) {
        const otherOption = `Outro: ${answer.otherText}`;
        const otherOptions = answer.selectedOptions.filter(opt => opt !== 'other');
        return [...otherOptions, otherOption];
      }
      return answer.selectedOptions;
    }

    // Single-select with "other" chosen.
    if (answer.selectedOption === 'other' && answer.otherText) {
      return `Outro: ${answer.otherText}`;
    }

    // Regular single-select.
    if (answer.selectedOption) {
      return answer.selectedOption;
    }
  }

  // Already-normalized "other" string (e.g. re-processed data).
  if (typeof answer === 'string' && answer.startsWith('Outro: ')) {
    return answer;
  }

  // Plain array/string answer, nothing to normalize.
  return answer;
};
