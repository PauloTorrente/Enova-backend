import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { log, DIAGNOSTIC_MODE } from './surveys.debug.log.util.js';

// Deep-dive diagnostic for one survey: response stats, expiration info,
// and a per-question structural breakdown — useful for debugging why a
// specific survey isn't behaving as expected.
export const debugSurveyDetails = async (req, res) => {
  log('🔍', 'Detailed survey analysis requested');

  try {
    const clientId = req.client?.id;
    const surveyId = req.params.surveyId;

    if (!clientId) {
      return res.status(403).json({ success: false, message: 'Client authentication required' });
    }
    if (!surveyId) {
      return res.status(400).json({ success: false, message: 'Survey ID is required' });
    }

    const survey = await Survey.findOne({ where: { id: surveyId, clientId }, raw: true });
    if (!survey) {
      log('❌', `Survey ${surveyId} not found or access denied`);
      return res.status(404).json({ success: false, message: 'Survey not found or access denied' });
    }

    const responseCount = await Result.count({ where: { surveyId } });
    const questions = Array.isArray(survey.questions) ? survey.questions : JSON.parse(survey.questions || '[]');

    const questionsAnalysis = questions.map((question, index) => ({
      index: index + 1,
      questionId: question.questionId,
      type: question.type,
      multipleSelections: question.multipleSelections,
      selectionLimit: question.selectionLimit,
      optionsCount: question.options?.length || 0
    }));

    res.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        clientId: survey.clientId,
        expirationTime: survey.expirationTime,
        responseLimit: survey.responseLimit,
        accessToken: survey.accessToken
      },
      statistics: {
        responseCount,
        responsePercentage: survey.responseLimit
          ? Math.min(100, Math.round((responseCount / survey.responseLimit) * 100))
          : null,
        isExpired: new Date() > new Date(survey.expirationTime),
        daysUntilExpiration: Math.ceil((new Date(survey.expirationTime) - new Date()) / (1000 * 60 * 60 * 24))
      },
      questionsAnalysis: {
        totalQuestions: questions.length,
        questions: questionsAnalysis,
        summary: {
          multipleChoice: questions.filter(q => q.type === 'multiple').length,
          textQuestions: questions.filter(q => q.type === 'text').length,
          withSelectionLimit: questions.filter(q => q.selectionLimit).length
        }
      },
      diagnostics: DIAGNOSTIC_MODE ? {
        rawQuestionsType: typeof survey.questions,
        hasQuestions: !!survey.questions
      } : undefined
    });
  } catch (error) {
    log('❌', 'Survey analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze survey',
      details: DIAGNOSTIC_MODE ? error.message : undefined
    });
  }
};
