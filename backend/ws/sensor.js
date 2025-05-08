const WebSocket = require('ws')
const { getSensorData } = require('../services/influxService')
const jwt = require('jsonwebtoken')
const logger = require('../logger')

// Fonction pour authentifier le token JWT
function authenticateJWT(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded
  } catch (err) {
    logger.error("Token invalide ou expiré", err)
    return null
    }
  }

  module.exports = (server) => {
    const wss = new WebSocket.Server({ 
    server,
    path: '/ws/sensor',
    handleProtocols: (protocols, request) => {
      // Récupérer le token depuis le Set de protocoles
      const protocolsArray = Array.from(protocols) // Convertir le Set en tableau
      const token = protocolsArray[1] // Le token est le deuxième élément du Set

      if (!token) {
      logger.error("Token manquant dans les protocoles")
      return false // Rejet de la connexion WebSocket si le token est manquant
      }

      // Vérification du token JWT
      const decoded = authenticateJWT(token)
      if (!decoded) {
      logger.error("Token invalide ou expiré")
      return false // Rejet de la connexion WebSocket si le token est invalide
      }

      // Si le token est valide, on autorise la connexion et on retourne le protocole
      return protocolsArray[0] // Retourne le premier protocole (valide)
    }
    })

    // Gestion de la connexion WebSocket
    wss.on('connection', async (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1])
    const deviceId = urlParams.get('device_id')
    
    if (!deviceId) {
      logger.error("Aucun device_id fourni")
      ws.send(JSON.stringify({ error: "Aucun device_id fourni" }))
      ws.close()
      return
    }

    // Envoi des données en temps réel pour chaque capteur
    const intervalId = setInterval(async () => {
      try {
      const sensorNames = ['temperature', 'humidity', 'pressure'] // Remplace par tes capteurs réels

      for (const sensorName of sensorNames) {
        const data = await getSensorData(deviceId, sensorName, '-365d', 'now()', '1s', false)

        const latest = data.length > 0 ? data[data.length - 1] : null

        if (latest) {
        const message = JSON.stringify({
          sensor: sensorName,
          value: latest.value,
          timestamp: latest.time
        })
        ws.send(message)
        }
      }
      } catch (err) {
      logger.error(`Erreur lors de la récupération des données pour ${deviceId} :`, err)
      }
    }, 1000)

    // Fermeture de la connexion WebSocket
    ws.on('close', () => {
      clearInterval(intervalId)
    })

    // Gestion des erreurs WebSocket
    ws.on('error', (err) => {
      logger.error(`Erreur WebSocket : ${err.message}`)
    })
  })
}
