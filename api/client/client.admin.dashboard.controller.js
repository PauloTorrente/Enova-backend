import Survey from '../surveys/surveys.model.js';
import Result from '../results/results.model.js';
import User from '../users/users.model.js';
import Client from './client.model.js';
import { sequelize } from '../../config/database.js';

// Platform-wide stats dashboard for client_admin: totals, recent surveys,
// most active clients, and most-answered surveys across every client.
export const getAdminDashboard = async (req, res) => {
  try {
    if (req.client.role !== 'client_admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    const [totalSurveys, totalClients, totalResponses, totalUsers] = await Promise.all([
      Survey.count(),
      Client.count(),
      Result.count(),
      User.count()
    ]);

    const recentSurveys = await Survey.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{ model: Client, as: 'client', attributes: ['id', 'companyName', 'contactEmail'] }]
    });

    const activeClients = await Client.findAll({
      attributes: [
        'id', 'companyName', 'contactEmail',
        [sequelize.fn('COUNT', sequelize.col('surveys.id')), 'surveyCount'],
        [sequelize.fn('MAX', sequelize.col('surveys.createdAt')), 'lastSurveyDate']
      ],
      include: [{ model: Survey, as: 'surveys', attributes: [], required: false }],
      group: ['Client.id'],
      order: [[sequelize.literal('surveyCount'), 'DESC']],
      limit: 5
    });

    const popularSurveys = await Survey.findAll({
      attributes: ['id', 'title', 'clientId', [sequelize.fn('COUNT', sequelize.col('results.id')), 'responseCount']],
      include: [
        { model: Client, as: 'client', attributes: ['companyName'] },
        { model: Result, as: 'results', attributes: [], required: false }
      ],
      group: ['Survey.id'],
      order: [[sequelize.literal('responseCount'), 'DESC']],
      limit: 5
    });

    res.status(200).json({
      success: true,
      message: 'Admin dashboard retrieved successfully',
      dashboard: {
        statistics: {
          totalSurveys,
          totalClients,
          totalResponses,
          totalUsers,
          averageResponsesPerSurvey: totalSurveys > 0 ? (totalResponses / totalSurveys).toFixed(1) : 0,
          averageSurveysPerClient: totalClients > 0 ? (totalSurveys / totalClients).toFixed(1) : 0
        },
        recentSurveys,
        activeClients,
        popularSurveys,
        clientAdmin: {
          id: req.client.id,
          companyName: req.client.companyName,
          contactEmail: req.client.contactEmail,
          role: req.client.role
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`[client.admin.dashboard] getAdminDashboard failed (adminId=${req.client?.id}):`, error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development' ? { errorName: error.name, adminId: req.client?.id } : undefined
    });
  }
};
