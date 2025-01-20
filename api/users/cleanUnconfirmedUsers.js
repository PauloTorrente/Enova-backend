import cron from 'node-cron';
import { Op } from 'sequelize';
import User from './users.model.js';

// Schedule a cron job to run every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    // Find and delete users who haven't confirmed their email within 30 minutes of registration
    await User.destroy({
      where: {
        isConfirmed: false,
        createdAt: {
          [Op.lt]: new Date(now - 30 * 60 * 1000), // 30 minutes ago
        },
      },
    });

    console.log('Deleted unconfirmed users who were registered more than 30 minutes ago');
  } catch (error) {
    console.error('Error cleaning unconfirmed users:', error);
  }
});
