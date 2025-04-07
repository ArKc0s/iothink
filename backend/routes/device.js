const express = require('express')
const crypto = require('crypto')
const Device = require('../models/Device')
const jwt = require('jsonwebtoken')

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
      return res.status(202).json({ authorized: false });
    }
    
    const token = jwt.sign(
      { sub: device.device_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
    
    return res.status(200).json({
      authorized: true,
      device_id: device.device_id,
      jwt: token,
      mqtt_host: 'mqtt.iot.euklyde.fr',
      mqtt_port: 8883,
      topic: `pico/${device.device_id}`
    });

} catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
}
})

router.patch('/:device_id/authorize', async (req, res) => {
  const { device_id } = req.params

  try {
    const device = await Device.findOne({ device_id })

    if (!device) {
      return res.status(404).json({ error: 'Device not found' })
    }

    if (device.authorized) {
      return res.status(200).json({
        message: 'Device already authorized',
        device_id: device.device_id,
      })
    }

    device.authorized = true
    device.api_key = crypto.randomUUID()
    await device.save()

    return res.status(200).json({
      message: 'Device authorized',
      device_id: device.device_id,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:device_id/token', async (req, res) => {
  const { device_id } = req.params

  try {
    const device = await Device.findOne({ device_id })

    if (!device || !device.authorized) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const token = jwt.sign(
      { sub: device.device_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    return res.json({ jwt: token })
  } catch (err) {
    console.error('[TOKEN RENEWAL ERROR]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})
module.exports = router