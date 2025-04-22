const Device = require('../models/Device');

async function updateInactiveDevices(thresholdMinutes = 5) {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  try {
    const result = await Device.updateMany(
      { last_seen: { $lt: threshold }, status: 'active' },
      { $set: { status: 'inactive' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[MAINTENANCE] ${result.modifiedCount} device(s) marked as inactive.`);
    }
  } catch (err) {
    console.error('[MAINTENANCE ERROR]', err);
  }
}

module.exports = {
  updateInactiveDevices
};
