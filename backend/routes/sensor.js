const express = require('express')
const authenticate = require('../middleware/auth')
const { getSensorsStatus, getSensorData } = require('../services/influxService')
const Device = require('../models/Device')

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
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const devices = await Device.find({ device_id: { $ne: 'telegraf' } });
    const result = {};

    for (const device of devices) {
      const status = await getSensorsStatus(device.device_id);
      result[device.device_id] = status;
    }

    return res.json(result);
  } catch (err) {
    console.error('[Device Status Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve devices and sensors' });
  }
});

/**
 * @swagger
 * /sensors/{device_id}:
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
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    const result = await getSensorsStatus(device_id)
    return res.json(result)
  } catch (err) {
    console.error('[Influx Error]', err)
    return res.status(500).json({ error: 'Failed to query sensor status' })
  }
})

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
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    // Calcul de la durée totale en secondes
    const now = new Date()
    const startDate = start.includes('-')
      ? new Date(now.getTime() + parseDuration(start))
      : new Date(Date.parse(start))
    const stopDate = stop === 'now()' ? now : new Date(Date.parse(stop))
    const durationInSeconds = (stopDate - startDate) / 1000

    // Définition dynamique du bucket interval
    let bucketInterval = '10s'
    if (durationInSeconds > 60 * 60) bucketInterval = '1m'   // Plus d'une heure
    if (durationInSeconds > 24 * 60 * 60) bucketInterval = '15m'  // Plus d'un jour
    if (durationInSeconds > 7 * 24 * 60 * 60) bucketInterval = '1h'  // Plus d'une semaine
    if (durationInSeconds > 30 * 24 * 60 * 60) bucketInterval = '1d'  // Plus d'un mois
    if (durationInSeconds > 365 * 24 * 60 * 60) bucketInterval = '7d' // Plus d'un an

    console.log(`Bucket Interval: ${bucketInterval}`)

    const data = await getSensorData(device_id, sensor_name, start, stop, bucketInterval)

    // Parse l'intervalle en ms
    const bucketIntervalMs = parseDuration(bucketInterval)
    const filledData = fillMissingBuckets(startDate, stopDate, bucketIntervalMs, data)

    return res.json({ sensor: sensor_name, data: filledData })
  } catch (err) {
    console.error('[Influx Error]', err)
    return res.status(500).json({ error: 'Failed to query sensor data' })
  }
})

function parseDuration(duration) {
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }

  const match = duration.match(/(-?\d+)([smhd])/)
  if (!match) return 0

  const [, value, unit] = match
  return parseInt(value) * units[unit]
}

function roundToBucket(date, intervalMs) {
  return Math.floor(date.getTime() / intervalMs) * intervalMs
}

function fillMissingBuckets(startDate, stopDate, bucketIntervalMs, rawData) {

  const result = []

  const valueByTimestamp = new Map(
    rawData.map(item => [
      roundToBucket(new Date(item.time), bucketIntervalMs),
      item.value,
    ])
  )  
  for (let t = startDate.getTime(); t <= stopDate.getTime(); t += bucketIntervalMs) {
    const value = valueByTimestamp.has(t) ? valueByTimestamp.get(t) : null
    result.push({ time: new Date(t).toISOString(), value })
  }

  return result
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
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const devices = await Device.find({ device_id: { $ne: 'telegraf' } });
    let activeSensors = 0;
    let inactiveSensors = 0;

    for (const device of devices) {
      const status = await getSensorsStatus(device.device_id);
      activeSensors += status.active.length;
      inactiveSensors += status.inactive.length;
    }

    return res.json({ activeSensors, inactiveSensors });
  } catch (err) {
    console.error('[Device Stats Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve device stats' });
  }
});

module.exports = router
