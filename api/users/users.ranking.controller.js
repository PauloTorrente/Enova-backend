import User from './users.model.js';

// GET /api/users/ranking — top respondents by loyalty score, for the
// client-facing "who's most reliable" leaderboard in Enova Pulse. Read-only,
// available to any authenticated client (not just client_admin — awarding
// points is the privileged action, viewing the board isn't). Exposes only
// what's needed for a leaderboard: no email/phone/address.
export const getUserRanking = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  try {
    const users = await User.findAll({
      where: { deleted: false },
      attributes: ['id', 'firstName', 'lastName', 'score'],
      order: [['score', 'DESC']],
      limit,
    });

    const ranking = users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      // Last name shown as an initial only — a leaderboard doesn't need a
      // respondent's full identity, and clients aren't otherwise shown who
      // specifically answered outside their own surveys.
      name: `${user.firstName} ${(user.lastName || '').charAt(0)}${user.lastName ? '.' : ''}`.trim(),
      score: user.score || 0,
    }));

    res.status(200).json({ success: true, ranking });
  } catch (error) {
    console.error('[users.ranking] getUserRanking failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch ranking' });
  }
};
