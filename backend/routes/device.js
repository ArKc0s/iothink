const express = require('express')
const crypto = require('crypto')
const Device = require('../models/Device')

const router = express.Router()

router.post('/register', async (req, res) => {
    const { device_id, mac } = req.body
  
    if (!device_id || !mac) {
      return res.status(400).json({ error: 'device_id and mac are required' })
    }
  
    try {
      const existing = await Device.findOne({ device_id })
  
      if (existing) {
        return res.status(200).json({ status: existing.authorized ? 'approved' : 'pending' })
      }
  
      const newDevice = new Device({
        device_id,
        mac,
        authorized: false,
        api_key: null,
        created_at: new Date(),
        status: 'inactive'
      })
  
      await newDevice.save()
  
      return res.status(202).json({
        status: 'pending',
        message: 'Device registered and pending approval'
      })
  
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Server error' })
    }
  })

router.get('/:device_id/credentials', async (req, res) => {
const { device_id } = req.params

try {
    const device = await Device.findOne({ device_id })

    if (!device) {
    return res.status(404).json({ error: 'Device not found' })
    }

    if (!device.authorized || !device.api_key) {
    return res.status(202).json({ authorized: false })
    }

    return res.status(200).json({
    authorized: true,
    device_id: device.device_id,
    api_key: device.api_key,
    mqtt_host: 'mqtt.iot.euklyde.fr',
    mqtt_port: 8883,
    topic: `pico/${device.device_id}`
    })

} catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
}
})
module.exports = router