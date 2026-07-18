import { verifyClientAccessWithPrivileges } from './results.access.service.js';
import Result from './results.model.js';
import User from '../users/users.model.js';

// Awards loyalty points to one user for responding to a survey. This is
// the only mutating endpoint in the results.client.* controllers — every
// other handler here is read-only.
export const awardPointsToUser = async (req, res) => {
  const { surveyId, userId } = req.params;
  const { points } = req.body;

  try {
    if (!points || typeof points !== 'number') {
      return res.status(400).json({ message: 'Points must be a valid number' });
    }

    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);

    const userResponse = await Result.findOne({ where: { surveyId, userId } });
    if (!userResponse) {
      return res.status(404).json({ message: 'User did not respond to this survey' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentScore = user.score || 0;
    const newScore = currentScore + points;
    await user.update({ score: newScore });

    res.status(200).json({
      success: true,
      message: 'Points awarded successfully!',
      pointsAwarded: points,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        previousScore: currentScore,
        newScore,
        totalChange: points
      },
      survey: { id: surveyId, responseId: userResponse.id },
      awardedBy: {
        clientId: req.client?.id,
        companyName: req.client?.companyName,
        role: req.client?.role,
        isAdmin: req.client?.role === 'client_admin',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`[results.client.points] awardPointsToUser failed (surveyId=${surveyId}, userId=${userId}, clientId=${req.client?.id}):`, error.message);
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: 'Error awarding points',
      error: error.message,
      debug: process.env.NODE_ENV === 'development'
        ? { errorName: error.name, surveyId, userId, clientRole: req.client?.role }
        : undefined
    });
  }
};
