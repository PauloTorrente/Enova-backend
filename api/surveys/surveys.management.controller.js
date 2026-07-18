import * as surveysService from './surveys.service.js';

// Delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  const surveyId = req.params.id;
  try {
    await surveysService.deleteSurvey(surveyId);
    res.status(200).json({ message: 'Survey deleted' });
  } catch (error) {
    console.error(`[surveys.management] deleteSurvey failed (surveyId=${surveyId}):`, error.message);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey details by access token (public endpoint)
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const { accessToken } = req.query;
    if (!accessToken) {
      return res.status(400).json({ message: 'Token required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    res.status(200).json(survey);
  } catch (error) {
    // Never log the raw access token — it's the respondent's credential.
    console.error('[surveys.management] getSurveyByAccessToken failed:', error.message);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};
