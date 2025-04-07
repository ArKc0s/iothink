const express = require('express')
const jwt = require('jsonwebtoken')
const Device = require('../models/Device')

const router = express.Router()

const isTelegraf = (username, password) => {
  return (
    username === 'telegraf' &&
    password === process.env.TELEGRAF_API_KEY
  )
}

// ---------------------
// AUTH
// ---------------------
router.post('/auth', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) return res.status(403).json({ Ok: false, Error: "ERROR" });

  if (isTelegraf(username, password)) return res.status(200).json({ Ok: true, Error: "" })

  try {
    const device = await Device.findOne({ device_id: username })

    if (!device || !device.authorized || device.api_key !== password) {
      return res.status(403).json({ Ok: false, Error: "ERROR" });
    }

    device.last_seen = new Date()
    device.status = 'active'
    await device.save()

    return res.status(200).json({ Ok: true, Error: "" });
  } catch (err) {
    console.error('[AUTH ERROR]', err)
    return res.status(403).json({ Ok: false, Error: "ERROR" });
  }
})

// ---------------------
// SUPERUSER
// ---------------------
router.post('/superuser', (req, res) => {
  const { username } = req.body

  if (username === 'telegraf') return res.status(200).json({ Ok: true, Error: "" })

  return res.status(403).json({ Ok: false, Error: "ERROR" });
})

// ---------------------
// ACL
// ---------------------
router.post('/acl', async (req, res) => {
  const { username, topic } = req.body

  if (!username || !topic) return res.status(403).json({ Ok: false, Error: "ERROR" });

  if (username === 'telegraf') return res.status(200).json({ Ok: true, Error: "" })

  const expectedTopic = `pico/${username}`
  return topic === expectedTopic ? res.status(200).json({ Ok: true, Error: "" }) : res.status(403).json({ Ok: false, Error: "ERROR" });
})

// ---------------------
// JWT: AUTH
// ---------------------
router.post('/jwt/auth', async (req, res) => {
  const token = extractToken(req)

  if (!token) return res.status(401).json({ Ok: false, Error: 'No token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const device = await Device.findOne({ device_id: decoded.sub })

    if (!device || !device.authorized) {
      return res.status(403).json({ Ok: false, Error: 'Unauthorized device' })
    }

    device.last_seen = new Date()
    device.status = 'active'
    await device.save()

    return res.status(200).json({ Ok: true, Error: '' })
  } catch (err) {
    console.error('[JWT AUTH ERROR]', err.message)
    return res.status(403).json({ Ok: false, Error: 'Invalid token' })
  }
})

// ---------------------
// JWT: SUPERUSER
// ---------------------
router.post('/jwt/superuser', (req, res) => {
  const token = extractToken(req)

  if (!token) return res.status(401).json({ Ok: false, Error: 'Missing token' })

  try {
    jwt.verify(token, process.env.JWT_SECRET)
    return res.status(200).json({ Ok: false, Error: '' }) // No superusers
  } catch (err) {
    return res.status(403).json({ Ok: false, Error: 'Invalid token' })
  }
})

// ---------------------
// JWT: ACL
// ---------------------
router.post('/jwt/acl', (req, res) => {
  const token = extractToken(req)
  const { topic, acc, clientid } = req.body

  if (!token) return res.status(401).json({ Ok: false, Error: 'Missing token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const expectedTopic = `pico/${decoded.sub}`

    if (topic === expectedTopic) {
      return res.status(200).json({ Ok: true, Error: '' })
    }

    return res.status(403).json({ Ok: false, Error: 'Unauthorized topic' })
  } catch (err) {
    return res.status(403).json({ Ok: false, Error: 'Invalid token' })
  }
})

// ---------------------
function extractToken(req) {
  const authHeader = req.headers['authorization']
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

module.exports = router
