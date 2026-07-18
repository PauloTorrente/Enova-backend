import Survey from '../surveys/surveys.model.js';
import User from '../users/users.model.js';
import Result from './results.model.js';
import Client from '../client/client.model.js';
import { sequelize } from '../../config/database.js';

// Cross-client endpoints, restricted to client_admin. Regular clients
// only ever see their own surveys via results.client.responses.controller.js
// and friends — these two handlers are the only place that can see
// everything at once, so the role check here is the actual security
// boundary, not just a UX nicety.

// Lists every survey across every client, for the client_admin overview page.
export const getAllSurveys = async (req, res) => {
  try {
    if (req.client?.role !== 'client_admin') {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
        clientRole: req.client?.role
      });
    }

    const surveys = await Survey.findAll({
      include: [{
        model: Client,
        as: 'client',
        attributes: ['id', 'companyName', 'contactEmail', 'contactName', 'industry']
      }],
      order: [['createdAt', 'DESC']]
    });

    const formattedSurveys = surveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      responseLimit: survey.responseLimit,
      expirationTime: survey.expirationTime,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      client: survey.client
        ? {
            id: survey.client.id,
            companyName: survey.client.companyName,
            contactEmail: survey.client.contactEmail,
            contactName: survey.client.contactName,
            industry: survey.client.industry
          }
        : null,
      questionsCount: survey.questions
        ? (typeof survey.questions === 'string' ? JSON.parse(survey.questions).length : survey.questions.length)
        : 0
    }));

    return res.status(200).json({
      success: true,
      message: 'All surveys retrieved successfully',
      surveys: formattedSurveys,
      metadata: {
        totalSurveys: surveys.length,
        clientAdmin: { id: req.client.id, companyName: req.client.companyName, role: req.client.role }
      }
    });
  } catch (error) {
    console.error(`[results.client.admin] getAllSurveys failed (adminId=${req.client?.id}):`, error.message);
    return res.status(500).json({
      message: 'Failed to fetch all surveys',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? { errorName: error.name, adminId: req.client?.id } : undefined
    });
  }
};

// Aggregate stats for the client_admin dashboard: totals, most recent
// surveys, most active clients, and most-answered surveys.
export const getAdminDashboard = async (req, res) => {
  try {
    if (req.client?.role !== 'client_admin') {
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
      include: [{ model: Client, as: 'client', attributes: ['companyName'] }]
    });

    const activeClients = await Client.findAll({
      attributes: ['id', 'companyName', 'contactEmail', [sequelize.fn('COUNT', sequelize.col('surveys.id')), 'surveyCount']],
      include: [{ model: Survey, as: 'surveys', attributes: [] }],
      group: ['Client.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('surveys.id')), 'DESC']],
      limit: 5
    });

    const popularSurveys = await Survey.findAll({
      attributes: ['id', 'title', [sequelize.fn('COUNT', sequelize.col('results.id')), 'responseCount']],
      include: [
        { model: Result, as: 'results', attributes: [] },
        { model: Client, as: 'client', attributes: ['companyName'] }
      ],
      group: ['Survey.id', 'client.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('results.id')), 'DESC']],
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
        recentSurveys: recentSurveys.map((s) => ({
          id: s.id, title: s.title, clientCompany: s.client?.companyName, createdAt: s.createdAt, status: s.status
        })),
        activeClients: activeClients.map((c) => ({
          id: c.id, companyName: c.companyName, contactEmail: c.contactEmail, surveyCount: c.dataValues.surveyCount
        })),
        popularSurveys: popularSurveys.map((s) => ({
          id: s.id, title: s.title, clientCompany: s.client?.companyName, responseCount: s.dataValues.responseCount
        })),
        clientAdmin: { id: req.client.id, companyName: req.client.companyName, role: req.client.role }
      }
    });
  } catch (error) {
    console.error(`[results.client.admin] getAdminDashboard failed (adminId=${req.client?.id}):`, error.message);
    res.status(500).json({ message: 'Failed to fetch admin dashboard', error: error.message });
  }
};
