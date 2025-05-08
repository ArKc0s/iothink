const Device = require('../models/Device');
const logger = require('../logger');

async function updateInactiveDevices(thresholdMinutes = 5) {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  try {
    const result = await Device.updateMany(
      { last_seen: { $lt: threshold }, status: 'active' },
      { $set: { status: 'inactive' } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`[MAINTENANCE] ${result.modifiedCount} device(s) marked as inactive.`);
    } else {
      logger.info('[MAINTENANCE] No devices were marked as inactive.');
    }
  } catch (err) {
    logger.error('[MAINTENANCE ERROR]', err);
  }
}

module.exports = {
  updateInactiveDevices
};
