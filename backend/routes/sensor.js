const express = require('express')
const authenticate = require('../middleware/auth')
const { getSensorsStatus, getSensorData } = require('../services/influxService')

const router = express.Router()

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
 *         description: Identifiant du device (ex: rpi-pico-001)
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
router.get('/:device_id', authenticate, async (req, res) => {
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
 *         description: Nom du capteur (ex: temperature, humidity)
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           default: "-1h"
 *         description: Début de la période (ex: -1h, -24h, 2024-01-01T00:00:00Z)
 *       - in: query
 *         name: stop
 *         schema:
 *           type: string
 *           default: "now()"
 *         description: Fin de la période (ex: now(), 2024-01-01T01:00:00Z)
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
    const data = await getSensorData(device_id, sensor_name, start, stop)
    return res.json({ sensor: sensor_name, data })
  } catch (err) {
    console.error('[Influx Error]', err)
    return res.status(500).json({ error: 'Failed to query sensor data' })
  }
})

module.exports = router
