import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

export const respondToSurveyPermissive = async (req, res) => {
  try {
    const { accessToken } = req.query;
    const userId = req.user?.userId;

    // Check if access token is provided
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Find survey by access token
    const survey = await Survey.findOne({ where: { accessToken } });
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Check if survey has reached response limit
    const responseCount = await Result.count({ where: { surveyId: survey.id } });
    if (survey.responseLimit !== null && responseCount >= survey.responseLimit) {
      return res.status(400).json({ 
        message: 'This survey has reached the maximum response limit.' 
      });
    }

    // Check if user already responded to this survey
    const existingResponse = await Result.findOne({
      where: { surveyId: survey.id, userId }
    });

    if (existingResponse) {
      return res.status(400).json({ message: 'You have already responded to this survey.' });
    }

    // Validate that response is an array
    const response = req.body;
    if (!Array.isArray(response)) {
      return res.status(400).json({ message: 'Response should be an array' });
    }

    // Parse survey questions (handle both string and object formats)
    const questions = typeof survey.questions === 'string' 
      ? JSON.parse(survey.questions) 
      : survey.questions;

    const resultEntries = [];
    const warnings = [];

    // Process each response item
    for (const item of response) {
      // PERMISSIVE LOGIC - Try to find the question in multiple ways
      let questionObj = questions.find(q => 
        q.questionId === item.questionId || 
        q.id === item.questionId
      );

      // If not found by ID, try by index
      if (!questionObj) {
        const numericId = parseInt(item.questionId);
        if (!isNaN(numericId)) {
          questionObj = questions[numericId - 1];
          if (questionObj) {
            warnings.push(`Question ID ${item.questionId} mapped to index ${numericId - 1}`);
          }
        }
      }

      // If still not found, use fallback or skip
      if (!questionObj) {
        warnings.push(`Question with ID ${item.questionId} not found, using fallback`);
        // Create basic question object to continue processing
        questionObj = {
          question: `Question ${item.questionId}`,
          type: 'text', // default type
          multipleSelections: 'no'
        };
      }

      const questionText = questionObj.question || `Question ${item.questionId}`;
      
      // Basic validations (keep the ones that make sense)
      if (questionObj.type === 'multiple') {
        if (questionObj.multipleSelections === 'yes') {
          // Convert single answer to array if needed
          if (!Array.isArray(item.answer)) {
            item.answer = [item.answer];
          }
          
          // Check selection limit
          if (questionObj.selectionLimit && item.answer.length > questionObj.selectionLimit) {
            return res.status(400).json({
              message: `Question "${questionText}" allows maximum ${questionObj.selectionLimit} selection(s). You selected ${item.answer.length}.`
            });
          }
        } else {
          // For single selection, take first array element if array is provided
          if (Array.isArray(item.answer)) {
            item.answer = item.answer[0];
          }
        }
      }

      // Prepare result entry for database
      resultEntries.push({
        surveyId: survey.id,
        userId,
        question: questionText,
        answer: item.answer,
      });
    }

    // Save all responses to database
    const savedResults = await Result.bulkCreate(resultEntries);

    return res.status(200).json({ 
      message: 'Response recorded successfully',
      details: {
        savedCount: savedResults.length,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    });
  } catch (error) {
    // Handle any unexpected errors
    res.status(500).json({ 
      message: error.message || 'Internal error while recording response'
    });
  }
};
