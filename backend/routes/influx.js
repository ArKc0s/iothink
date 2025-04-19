const express = require('express')
const authenticate = require('../middlewares/auth')
const { getSensorsStatus } = require('../services/influxService')

const router = express.Router()

router.get('/:device_id/sensors', authenticate, async (req, res) => {
  const { device_id } = req.params

  if (req.auth.sub !== device_id || req.auth.type !== 'device') {
    return res.status(403).json({ error: 'Token mismatch or invalid type' })
  }

  try {
    const result = await getSensorsStatus(device_id)
    return res.json(result)
  } catch (err) {
    console.error('[Influx Error]', err)
    return res.status(500).json({ error: 'Failed to query sensor status' })
  }
})

module.exports = router
