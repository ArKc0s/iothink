const express = require('express')
const authenticate = require('../middleware/auth')
const { getSensorsStatus, getSensorData } = require('../services/influxService')

const router = express.Router()

router.get('/sensors/:device_id', async (req, res) => {
  const { device_id } = req.params

  /*if (req.auth.sub !== device_id || req.auth.type !== 'device') {
    return res.status(403).json({ error: 'Token mismatch or invalid type' })
  }*/

  try {
    const result = await getSensorsStatus(device_id)
    return res.json(result)
  } catch (err) {
    console.error('[Influx Error]', err)
    return res.status(500).json({ error: 'Failed to query sensor status' })
  }
})

router.get('/data/:device_id/:sensor_name', async (req, res) => {
    const { device_id, sensor_name } = req.params
    const { start = '-1h', stop = 'now()' } = req.query
  
    try {
      const data = await getSensorData(device_id, sensor_name, start, stop)
      return res.json({ sensor: sensor_name, data })
    } catch (err) {
      console.error('[Influx Error]', err)
      return res.status(500).json({ error: 'Failed to query sensor data' })
    }
  })

module.exports = router
