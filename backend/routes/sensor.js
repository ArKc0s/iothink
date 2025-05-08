const express = require('express')
const authenticate = require('../middleware/auth')
const { getSensorsStatus, getSensorData } = require('../services/influxService')
const Device = require('../models/Device')
const logger = require('../logger')

const router = express.Router()

/**
 * @swagger
 * /sensors:
 *   get:
 *     summary: Liste les capteurs actifs et inactifs de tous les devices
 *     tags:
 *       - Sensors
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des capteurs pour tous les devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   active:
 *                     type: array
 *                     items:
 *                       type: string
 *                   inactive:
 *                     type: array
 *                     items:
 *                       type: string
 *       403:
 *         description: Accès refusé (admin uniquement)
 *       500:
 *         description: Erreur serveur lors de la récupération des capteurs
 */
router.get('/', authenticate, async (req, res) => {
  if (req.auth?.type !== 'admin') {
    logger.warn('Unauthorized access attempt to /sensors by non-admin user');
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    logger.info('Fetching devices and sensors status');
    const devices = await Device.find({ device_id: { $ne: 'telegraf' } });
    const result = {};

    for (const device of devices) {
      const status = await getSensorsStatus(device.device_id);
      result[device.device_id] = status;
    }

    logger.info('Successfully retrieved devices and sensors status');
    return res.json(result);
  } catch (err) {
    logger.error('[Device Status Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve devices and sensors' });
  }
});

/**
 * @swagger
 * /sensors/sensor/{device_id}:
 *   get:
 *     summary: Liste les capteurs actifs et inactifs d’un device
 *     tags:
 *       - Sensors
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: device_id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Identifiant du device (ex: rpi-pico-001)"
 *     responses:
 *       200:
 *         description: Liste des capteurs et leur statut
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active:
 *                   type: array
 *                   items:
 *                     type: string
 *                 inactive:
 *                   type: array
 *                   items:
 *                     type: string
 *       403:
 *         description: Accès refusé (admin uniquement)
 *       500:
 *         description: Erreur serveur lors de la récupération des capteurs
 */
router.get('/sensor/:device_id', authenticate, async (req, res) => {
  const { device_id } = req.params

  if (req.auth?.type !== 'admin') {
    logger.warn(`Unauthorized access attempt to /sensors/sensor/${device_id} by non-admin user`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    logger.info(`Fetching sensor status for device: ${device_id}`);
    const result = await getSensorsStatus(device_id);
    logger.info(`Successfully retrieved sensor status for device: ${device_id}`);
    return res.json(result);
  } catch (err) {
    logger.error(`[Sensor Status Error] Device: ${device_id}`, err);
    return res.status(500).json({ error: 'Failed to query sensor status' });
  }
});

/**
 * @swagger
 * /sensors/data/{device_id}/{sensor_name}:
 *   get:
 *     summary: Récupère les données d’un capteur pour un device donné
 *     tags:
 *       - Sensors
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: device_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant du device
 *       - in: path
 *         name: sensor_name
 *         required: true
 *         schema:
 *           type: string
 *         description: "Nom du capteur (ex: temperature, humidity)"
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           default: "-1h"
 *         description: "Début de la période (ex: -1h, -24h, 2024-01-01T00:00:00Z)"
 *       - in: query
 *         name: stop
 *         schema:
 *           type: string
 *           default: "now()"
 *         description: "Fin de la période (ex: now(), 2024-01-01T01:00:00Z)"
 *     responses:
 *       200:
 *         description: Données du capteur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sensor:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _time:
 *                         type: string
 *                         format: date-time
 *                       _value:
 *                         type: number
 *       403:
 *         description: Accès refusé (admin uniquement)
 *       500:
 *         description: Erreur serveur lors de la récupération des données
 */
router.get('/data/:device_id/:sensor_name', authenticate, async (req, res) => {
  const { device_id, sensor_name } = req.params
  const { start = '-1h', stop = 'now()' } = req.query

  if (req.auth?.type !== 'admin') {
    logger.warn(`Unauthorized access attempt to /sensors/data/${device_id}/${sensor_name} by non-admin user`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    logger.info(`Fetching sensor data for device: ${device_id}, sensor: ${sensor_name}, start: ${start}, stop: ${stop}`);

    // Calcul de la durée totale en secondes
    const now = new Date();
    const startDate = start.includes('-')
      ? new Date(now.getTime() + parseDuration(start))
      : new Date(Date.parse(start));
    const stopDate = stop === 'now()' ? now : new Date(Date.parse(stop));
    const durationInSeconds = (stopDate - startDate) / 1000;

    // Définition dynamique du bucket interval
    let bucketInterval = '10s';
    if (durationInSeconds >= 60 * 60) bucketInterval = '1m';   // Plus d'une heure
    if (durationInSeconds >= 24 * 60 * 60) bucketInterval = '15m';  // Plus d'un jour
    if (durationInSeconds >= 7 * 24 * 60 * 60) bucketInterval = '1h';  // Plus d'une semaine
    if (durationInSeconds >= 30 * 24 * 60 * 60) bucketInterval = '1d';  // Plus d'un mois
    if (durationInSeconds >= 365 * 24 * 60 * 60) bucketInterval = '7d'; // Plus d'un an

    logger.debug(`Calculated bucket interval: ${bucketInterval}`);

    const data = await getSensorData(device_id, sensor_name, start, stop, bucketInterval, true);

    logger.info(`Successfully retrieved sensor data for device: ${device_id}, sensor: ${sensor_name}`);
    return res.json({ sensor: sensor_name, data: data });
  } catch (err) {
    logger.error(`[Sensor Data Error] Device: ${device_id}, Sensor: ${sensor_name}`, err);
    return res.status(500).json({ error: 'Failed to query sensor data' });
  }
});

function parseDuration(duration) {
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  const match = duration.match(/(-?\d+)([smhd])/);
  if (!match) return 0;

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

/**
 * @swagger
 * /sensors/stats:
 *   get:
 *     summary: Récupère le nombre total de capteurs actifs et inactifs
 *     tags:
 *       - Sensors
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques des capteurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeSensors:
 *                   type: integer
 *                 inactiveSensors:
 *                   type: integer
 *       403:
 *         description: Accès refusé (admin uniquement)
 *       500:
 *         description: Erreur serveur lors de la récupération des statistiques
 */
router.get('/stats', authenticate, async (req, res) => {
  if (req.auth?.type !== 'admin') {
    logger.warn('Unauthorized access attempt to /sensors/stats by non-admin user');
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    logger.info('Fetching sensor statistics');
    const devices = await Device.find({ device_id: { $ne: 'telegraf' } });
    let activeSensors = 0;
    let inactiveSensors = 0;

    for (const device of devices) {
      const status = await getSensorsStatus(device.device_id);
      activeSensors += status.active.length;
      inactiveSensors += status.inactive.length;
    }

    logger.info('Successfully retrieved sensor statistics');
    return res.json({ activeSensors, inactiveSensors });
  } catch (err) {
    logger.error('[Device Stats Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve device stats' });
  }
});

module.exports = router
