const express = require('express')
const crypto = require('crypto')
const Device = require('../models/Device')
const jwt = require('jsonwebtoken')
const authenticate = require('../middleware/auth')
const logger = require('../logger'); 

const router = express.Router()

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
  const { device_id, mac } = req.body;
  if (!device_id || !mac) {
    logger.warn('Missing device_id or mac in request body');
    return res.status(400).json({ error: 'device_id and mac are required' });
  }

  try {
    const existing = await Device.findOne({ device_id });
    if (existing) {
      return res.status(200).json({ status: existing.authorized ? 'approved' : 'pending' });
    }

    const newDevice = new Device({
      device_id,
      mac,
      authorized: false,
      api_key: null,
      created_at: new Date(),
      status: 'inactive'
    });

    await newDevice.save();

    return res.status(202).json({
      status: 'pending',
      message: 'Device registered and pending approval'
    });
  } catch (err) {
    logger.error('Error registering device', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /devices/credentials:
 *   post:
 *     summary: Récupère un JWT si le couple device_id + mac est valide
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
 *         description: Credentials JWT renvoyés
 *       403:
 *         description: Appareil non autorisé ou données invalides
 *       404:
 *         description: Appareil non trouvé
 */
router.post('/credentials', async (req, res) => {
  const { device_id, mac } = req.body;

  if (!device_id || !mac) {
    logger.warn('Missing device_id or mac in request body');
    return res.status(400).json({ error: 'device_id and mac are required' });
  }

  try {
    const device = await Device.findOne({ device_id });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (!device.authorized || device.mac !== mac) {
      logger.warn(`Unauthorized access attempt for device ${device_id}`);
      return res.status(403).json({ authorized: false });
    }

    const token = jwt.sign(
      { sub: device.device_id, type: 'device' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      authorized: true,
      device_id: device.device_id,
      jwt: token,
      mqtt_host: 'mqtt.iot.euklyde.fr',
      mqtt_port: 8883,
      topic: `pico/${device.device_id}`
    });
  } catch (err) {
    logger.error('Error generating credentials', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /devices/{device_id}/authorize:
 *   patch:
 *     summary: Autorise un appareil à publier
 *     tags:
 *       - Devices
 *     security:
 *       - bearerAuth: []  # Authentification JWT requise (admin)
 *     parameters:
 *       - name: device_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appareil autorisé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 device_id:
 *                   type: string
 *       403:
 *         description: Accès refusé - admin requis
 *       404:
 *         description: Appareil introuvable
 */
router.patch('/:device_id/authorize', authenticate, async (req, res) => {
  const { device_id } = req.params;

  if (req.auth?.type !== 'admin') {
    logger.warn(`Unauthorized access attempt to authorize device ${device_id}`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const device = await Device.findOne({ device_id });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.authorized) {
      return res.status(200).json({
        message: 'Device already authorized',
        device_id: device.device_id,
      });
    }

    device.authorized = true;
    device.api_key = crypto.randomUUID();
    await device.save();

    return res.status(200).json({
      message: 'Device authorized',
      device_id: device.device_id,
    });
  } catch (err) {
    logger.error('Error authorizing device', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});

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
  const { device_id } = req.params;

  if (req.auth.sub !== device_id || req.auth.type !== 'device') {
    logger.warn(`Token mismatch or invalid type for device ${device_id}`);
    return res.status(403).json({ error: 'Token mismatch or invalid type' });
  }

  try {
    const device = await Device.findOne({ device_id });

    if (!device || !device.authorized) {
      logger.warn(`Unauthorized token renewal attempt for device ${device_id}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const token = jwt.sign(
      { sub: device.device_id, type: 'device' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ jwt: token });
  } catch (err) {
    logger.error('Error renewing token', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /devices/{device_id}/status:
 *   get:
 *     summary: Retourne le statut actuel et la dernière connexion d’un device
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
 *     responses:
 *       200:
 *         description: Informations du device
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 device_id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [active, inactive]
 *                 last_seen:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Accès refusé - admin requis
 *       404:
 *         description: Appareil introuvable
 */
router.get('/:device_id/status', authenticate, async (req, res) => {
  const { device_id } = req.params;

  if (req.auth?.type !== 'admin') {
    logger.warn(`Unauthorized access attempt to get status for device ${device_id}`);
    return res.status(403).json({ error: 'Admin access required' });
  }

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
    logger.error('Error retrieving device status', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: Retourne la liste de tous les devices
 *     tags:
 *       - Devices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   device_id:
 *                     type: string
 *                   mac:
 *                     type: string
 */
router.get('/', authenticate, async (req, res) => {
  if (req.auth?.type !== 'admin') {
    logger.warn('Unauthorized access attempt to get all devices');
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const devices = await Device.find({ device_id: { $ne: 'telegraf' } });
    return res.json(devices);
  } catch (err) {
    logger.error('Error retrieving devices', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /devices/stats:
 *   get:
 *     summary: Retourne les statistiques des devices
 *     tags:
 *       - Devices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques des devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDevices:
 *                   type: integer
 *                 activeDevices:
 *                   type: integer
 *                 inactiveDevices:
 *                   type: integer
 */
router.get('/stats', authenticate, async (req, res) => {
  if (req.auth?.type !== 'admin') {
    logger.warn('Unauthorized access attempt to get device stats');
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const devices = await Device.find({ device_id: { $ne: 'telegraf' } });
    const stats = {
      totalDevices: devices.length,
      activeDevices: devices.filter(d => d.status === 'active').length,
      inactiveDevices: devices.filter(d => d.status === 'inactive').length,
    };
    return res.json(stats);
  } catch (err) {
    logger.error('Error retrieving device stats', { error: err });
    return res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router
