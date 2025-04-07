const express = require('express')
const crypto = require('crypto')
const Device = require('../models/Device')
const jwt = require('jsonwebtoken')
const authenticate = require('../middleware/auth')

const router = express.Router()

async function updateInactiveDevices(thresholdMinutes = 5) {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  await Device.updateMany(
    { last_seen: { $lt: threshold }, status: 'active' },
    { $set: { status: 'inactive' } }
  );
}

/**
 * @swagger
 * /devices/register:
 *   post:
 *     summary: Enregistre un nouvel appareil
 *     tags:
 *       - Devices
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - mac
 *             properties:
 *               device_id:
 *                 type: string
 *               mac:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appareil déjà enregistré
 *       202:
 *         description: Enregistrement en attente d’autorisation
 */
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

/**
 * @swagger
 * /devices/{device_id}/credentials:
 *   get:
 *     summary: Récupère les credentials MQTT d’un appareil autorisé
 *     tags:
 *       - Devices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: device_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'appareil
 *     responses:
 *       200:
 *         description: Credentials JWT renvoyés
 *       202:
 *         description: Appareil non encore autorisé
 *       404:
 *         description: Appareil introuvable
 */
router.get('/:device_id/credentials', authenticate, async (req, res) => {
  const { device_id } = req.params

  if (req.auth.sub !== device_id || req.auth.type !== 'device') {
    return res.status(403).json({ error: 'Token mismatch or invalid type' })
  }

  try {
    const device = await Device.findOne({ device_id })
    if (!device || !device.authorized || !device.api_key) {
      return res.status(403).json({ authorized: false })
    }

    const token = jwt.sign(
      { sub: device.device_id, type: 'device' },
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
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})



/**
 * @swagger
 * /devices/{device_id}/authorize:
 *   patch:
 *     summary: Autorise un appareil à publier
 *     tags:
 *       - Devices
 *     parameters:
 *       - name: device_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appareil autorisé
 *       404:
 *         description: Appareil introuvable
 */
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

/**
 * @swagger
 * /devices/{device_id}/token:
 *   get:
 *     summary: Renouvelle un token JWT pour un device autorisé
 *     tags:
 *       - Devices
 *     security:
 *      - bearerAuth: []
 *     parameters:
 *       - name: device_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JWT renvoyé
 *       403:
 *         description: Appareil non autorisé
 */
router.get('/:device_id/token', authenticate, async (req, res) => {
  const { device_id } = req.params

  if (req.auth.sub !== device_id || req.auth.type !== 'device') {
    return res.status(403).json({ error: 'Token mismatch or invalid type' })
  }

  try {
    const device = await Device.findOne({ device_id })

    if (!device || !device.authorized) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const token = jwt.sign(
      { sub: device.device_id, type: 'device' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    return res.json({ jwt: token })
  } catch (err) {
    console.error('[TOKEN RENEWAL ERROR]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

/**
 * @swagger
 * /devices/{device_id}/status:
 *   get:
 *     summary: Retourne le statut actuel et la dernière connexion d’un device
 *     tags:
 *       - Devices
 *     parameters:
 *       - name: device_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Informations du device
 *       404:
 *         description: Appareil introuvable
 */
router.get('/:device_id/status', async (req, res) => {
  const { device_id } = req.params;

  try {
    const device = await Device.findOne({ device_id });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.json({
      device_id: device.device_id,
      status: device.status,
      last_seen: device.last_seen,
    });
  } catch (err) {
    console.error('[STATUS ERROR]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router
