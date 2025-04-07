const express = require('express')
const Device = require('../models/Device')

const router = express.Router()

router.post('/auth', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.send('ERROR')
  }

  try {
    const device = await Device.findOne({ device_id: username })

    if (!device || !device.authorized || device.api_key !== password) {
      return res.send('ERROR')
    }

    device.last_seen = new Date()
    device.status = 'active'
    await device.save()

    return res.send('OK')
  } catch (err) {
    console.error('[AUTH ERROR]', err)
    return res.send('ERROR')
  }
})

router.post('/superuser', (req, res) => {
  return res.send('ERROR')
})

router.post('/acl', async (req, res) => {
  const { username, topic } = req.body

  if (!username || !topic) {
    return res.send('ERROR')
  }

  const expectedTopic = `pico/${username}`
  if (topic === expectedTopic) {
    return res.send('OK')
  }

  return res.send('ERROR')
})

module.exports = router
