// Normalizes a raw stored answer (possibly a JSON string) into a
// display-ready value, expanding the "other" option into a readable
// "<Other label>: <free text>" string/array entry.
//
// This mirrors the normalization in results.analytics.answer.util.js but
// operates on the *stored* (possibly stringified) format rather than the
// already-parsed shape the analytics processors receive.
export const parseAnswerWithOtherOption = (answer, questionData = null) => {
  let parsedAnswer = answer;

  if (typeof parsedAnswer === 'string') {
    try {
      parsedAnswer = JSON.parse(parsedAnswer);
    } catch {
      // Not JSON — keep the raw string as-is (plain text answer).
    }
  }

  if (typeof parsedAnswer === 'object' && parsedAnswer !== null && parsedAnswer.otherText !== undefined) {
    const otherOptionText = questionData?.otherOptionText || 'Outro (especifique)';

    if (parsedAnswer.selectedOptions !== undefined) {
      const options = parsedAnswer.selectedOptions
        .map((opt) => (opt === 'other' ? `${otherOptionText}: ${parsedAnswer.otherText || ''}` : opt))
        .filter((opt) => opt !== null);

      const otherFormatted = `${otherOptionText}: ${parsedAnswer.otherText}`;
      if (parsedAnswer.otherText?.trim() && !options.includes(otherFormatted)) {
        options.push(otherFormatted);
      }

      return options;
    }

    if (parsedAnswer.selectedOption === 'other') {
      return `${otherOptionText}: ${parsedAnswer.otherText || ''}`;
    }
  }

  // Legacy "Outro: <text>" string format — already display-ready.
  return parsedAnswer;
};
