const WebSocket = require('ws')
const { getSensorData } = require('../services/influxService')
const jwt = require('jsonwebtoken')

function authenticateJWT(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded
  } catch (err) {
    console.error("❌ Token invalide ou expiré", err)
    return null
  }
}

module.exports = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/sensor',
    handleProtocols: (protocols, request) => {
      const token = request.headers['authorization']?.split(' ')[1]
      if (!token) {
        console.error("❌ Token manquant dans les en-têtes")
        return false // Rejet de la connexion WebSocket si le token est manquant
      }

      const decoded = authenticateJWT(token)
      if (!decoded) {
        console.error("❌ Token invalide ou expiré")
        return false // Rejet de la connexion WebSocket si le token est invalide
      }

      // Si le token est valide, on autorise la connexion et on retourne le protocole
      return protocols[0]
    }
  })

  console.log("✅ WebSocket server ready")

  wss.on('connection', async (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1])
    const deviceId = urlParams.get('device_id')
    
    if (!deviceId) {
      console.error("❌ Aucun device_id fourni")
      ws.send(JSON.stringify({ error: "Aucun device_id fourni" }))
      ws.close()
      return
    }

    console.log(`✅ Client connecté : ${deviceId}`)

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
        console.error(`[WebSocket] Erreur lors de la récupération des données pour ${deviceId} :`, err)
      }
    }, 1000)

    ws.on('close', () => {
      clearInterval(intervalId)
      console.log(`❌ Client déconnecté : ${deviceId}`)
    })

    ws.on('error', (err) => {
      console.error(`⚠️ Erreur WebSocket : ${err.message}`)
    })
  })
}
