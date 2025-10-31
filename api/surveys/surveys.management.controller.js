import * as surveysService from './surveys.service.js';

// Delete a survey (admin only)
export const deleteSurvey = async (req, res) => {
  try {
    const surveyId = req.params.id;
    console.log(`🗑️ Deleting Survey ID: ${surveyId}`);
    
    await surveysService.deleteSurvey(surveyId);
    
    console.log(`✅ Survey ${surveyId} Deleted Successfully`);
    res.status(200).json({ message: 'Survey deleted' });
  } catch (error) {
    console.error('❌ Delete Survey Error:', error);
    res.status(500).json({ message: 'Failed to delete survey' });
  }
};

// Get survey details by access token (public endpoint)
export const getSurveyByAccessToken = async (req, res) => {
  try {
    const { accessToken } = req.query;
    console.log(`🔍 Fetching Survey by Token: ${accessToken}`);
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Token required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    
    if (!survey) {
      console.error('❌ Survey Not Found for Token:', accessToken);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log(`✅ Survey Found: ${survey.title}`);
    res.status(200).json(survey);
  } catch (error) {
    console.error('❌ Get Survey Error:', error);
    res.status(500).json({ message: 'Failed to fetch survey' });
  }
};
