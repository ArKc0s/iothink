const Device = require('../models/Device');
const logger = require('../logger');

async function updateInactiveDevices(thresholdMinutes = 5) {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  try {
    const result = await Device.updateMany(
      { last_seen: { $lt: threshold }, status: 'active' },
      { $set: { status: 'inactive' } }
    );
  } catch (err) {
    logger.error('[MAINTENANCE ERROR]', err);
  }
}

module.exports = {
  updateInactiveDevices
};
