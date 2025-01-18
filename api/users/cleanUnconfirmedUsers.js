import cron from 'node-cron';
import { Op } from 'sequelize';
import User from './users.model.js';

cron.schedule('* * * * *', async () => {
  const expirationTime = 30 * 60 * 1000; 
  const thresholdTime = Date.now() - expirationTime;

  try {
    const result = await User.destroy({
      where: {
        isConfirmed: false,
        createdat: { [Op.lt]: new Date(thresholdTime) }, 
      },
    });

    console.log(`Deleted ${result} unconfirmed user(s) older than 30 minutes.`);
  } catch (error) {
    console.error('Error cleaning unconfirmed users:', error);
  }
});
