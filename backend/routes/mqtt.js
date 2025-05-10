const express = require('express')
const jwt = require('jsonwebtoken')
const Device = require('../models/Device')
const bodyParser = require('body-parser')

const router = express.Router()

const isTelegraf = (username, password) => {
  return (
    username === 'telegraf' &&
    password === process.env.TELEGRAF_API_KEY
  )
}

/**
 * @swagger
 * /mqtt/auth:
 *   post:
 *     summary: Authentifie un client MQTT avec username/password
 *     tags:
 *       - MQTT
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentification réussie
 *       403:
 *         description: Authentification refusée
 */
router.post('/auth', bodyParser.json(), async (req, res) => {
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

/**
 * @swagger
 * /mqtt/superuser:
 *   post:
 *     summary: Vérifie si un utilisateur est superuser
 *     tags:
 *       - MQTT
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: L'utilisateur est superuser
 *       403:
 *         description: L'utilisateur n'est pas superuser
 */
router.post('/superuser', bodyParser.json(), (req, res) => {
  const { username } = req.body
  if (username === 'telegraf') return res.status(200).json({ Ok: true, Error: "" })
  return res.status(403).json({ Ok: false, Error: "ERROR" });
})

/**
 * @swagger
 * /mqtt/acl:
 *   post:
 *     summary: Vérifie les droits d'accès MQTT à un topic
 *     tags:
 *       - MQTT
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               topic:
 *                 type: string
 *     responses:
 *       200:
 *         description: Accès autorisé
 *       403:
 *         description: Accès refusé
 */
router.post('/acl', bodyParser.json(), async (req, res) => {
  const { username, topic } = req.body
  if (!username || !topic) return res.status(403).json({ Ok: false, Error: "ERROR" });

  if (username === 'telegraf') return res.status(200).json({ Ok: true, Error: "" })

  const expectedTopic = `pico/${username}`
  return topic === expectedTopic ? res.status(200).json({ Ok: true, Error: "" }) : res.status(403).json({ Ok: false, Error: "ERROR" });
})

/**
 * @swagger
 * /mqtt/jwt/auth:
 *   post:
 *     summary: Authentifie un client MQTT via JWT
 *     tags:
 *       - MQTT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentification réussie via JWT
 *       403:
 *         description: Authentification refusée ou token invalide
 */
router.post('/jwt/auth', async (req, res) => {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ Ok: false, Error: 'No token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.type !== 'device') {
      return res.status(403).json({ Ok: false, Error: 'Invalid token type' })
    }

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


/**
 * @swagger
 * /mqtt/jwt/superuser:
 *   post:
 *     summary: Vérifie si un utilisateur JWT est superuser
 *     tags:
 *       - MQTT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: L'utilisateur n'est pas superuser (toujours false)
 *       403:
 *         description: Token invalide
 */
router.post('/jwt/superuser', (req, res) => {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ Ok: false, Error: 'Missing token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.type !== 'device') {
      return res.status(403).json({ Ok: false, Error: 'Invalid token type' })
    }

    return res.status(200).json({ Ok: false, Error: '' }) // No superusers
  } catch (err) {
    return res.status(403).json({ Ok: false, Error: 'Invalid token' })
  }
})

/**
 * @swagger
 * /mqtt/jwt/acl:
 *   post:
 *     summary: Vérifie les droits d'accès MQTT via JWT
 *     tags:
 *       - MQTT
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *               acc:
 *                 type: number
 *               clientid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Accès autorisé
 *       403:
 *         description: Accès refusé
 */
router.post('/jwt/acl', bodyParser.json(), async (req, res) => {
  const token = extractToken(req)
  const { topic } = req.body

  if (!token || !topic) {
    return res.status(401).json({ Ok: false, Error: 'Missing data' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.type !== 'device') {
      return res.status(403).json({ Ok: false, Error: 'Invalid token type' })
    }

    const expectedTopic = `pico/${decoded.sub}`

    if (topic === expectedTopic) {
      // Met à jour l'activité du device
      const device = await Device.findOne({ device_id: decoded.sub })
      if (device) {
        device.last_seen = new Date()
        device.status = 'active'
        await device.save()
      }

      return res.status(200).json({ Ok: true, Error: '' })
    }

    return res.status(403).json({ Ok: false, Error: 'Unauthorized topic' })
  } catch (err) {
    return res.status(403).json({ Ok: false, Error: 'Invalid token' })
  }
})

// --- Utilitaire ---
function extractToken(req) {
  const authHeader = req.headers['authorization']
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

module.exports = router
