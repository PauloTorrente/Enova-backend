import Client from './client.model.js';
import Survey from '../surveys/surveys.model.js';
import Result from '../results/results.model.js';

// Full profile + survey stats for one client — client_admin only. Not
// currently wired to a route in client.router.js; kept available for
// when an admin "view client" page needs it.
export const getClientDetails = async (req, res) => {
  const { clientId } = req.params;

  try {
    if (req.client.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const client = await Client.findByPk(clientId, {
      attributes: [
        'id', 'companyName', 'contactName', 'contactEmail',
        'phoneNumber', 'industry', 'role', 'isConfirmed',
        'createdAt', 'lastLogin', 'loginAttempts'
      ]
    });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const clientSurveys = await Survey.findAll({
      where: { clientId },
      attributes: ['id', 'title', 'status', 'createdAt', 'responseLimit'],
      order: [['createdAt', 'DESC']]
    });

    const surveyIds = clientSurveys.map(survey => survey.id);
    const totalClientResponses = surveyIds.length > 0
      ? await Result.count({ where: { surveyId: surveyIds } })
      : 0;

    res.status(200).json({
      success: true,
      message: 'Client details retrieved successfully',
      client,
      surveys: clientSurveys,
      statistics: {
        totalSurveys: clientSurveys.length,
        totalResponses: totalClientResponses,
        activeSurveys: clientSurveys.filter(s => s.status === 'active').length,
        completedSurveys: clientSurveys.filter(s => s.status === 'completed').length
      },
      metadata: {
        requestedBy: { adminId: req.client.id, adminCompany: req.client.companyName },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`[client.admin.details] getClientDetails failed (clientId=${clientId}, adminId=${req.client?.id}):`, error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching client details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
