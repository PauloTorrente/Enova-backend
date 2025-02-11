// This function validates the answers to ensure they meet the expected format
export const validateAnswers = (answers) => {
    if (!answers || typeof answers !== 'object') {
      return false; // Invalid answers if not an object (could be expanded to more specific checks)
    }
  
    // Example validation: you can add more detailed checks based on your survey structure
    return true; // If answers are valid, return true
  };
  