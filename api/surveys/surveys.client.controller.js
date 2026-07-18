import Survey from './surveys.model.js';
import Result from '../results/results.model.js';

// Get client's surveys with response counts
export const getClientSurveys = async (req, res) => {
  const clientId = req.client?.id;
  try {
    if (!clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const surveys = await Survey.findAll({ where: { clientId } });

    // Add response count statistics to each survey
    const surveysWithStats = await Promise.all(
      surveys.map(async survey => {
        const responseCount = await Result.count({ where: { surveyId: survey.id } });
        return {
          ...survey.toJSON(),
          responseCount
        };
      })
    );

    res.status(200).json({ surveys: surveysWithStats });
  } catch (error) {
    console.error(`[surveys.client] getClientSurveys failed (clientId=${clientId}):`, error.message);
    res.status(500).json({
      message: 'Failed to fetch surveys',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export main client controller functions
export default {
  getClientSurveys
};
