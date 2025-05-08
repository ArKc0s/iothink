const WebSocket = require('ws')
const { getSensorData } = require('../services/influxService')
const jwt = require('jsonwebtoken')  // Import de jsonwebtoken pour valider le JWT

// Fonction de validation du token JWT
function authenticateJWT(token) {
  try {
    // Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded
  } catch (err) {
    console.error("❌ Token invalide ou expiré", err)
    return null
  }
}

module.exports = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws/sensor' })

  console.log("✅ WebSocket server ready")

  wss.on('connection', async (ws, req) => {
    // Récupère les paramètres de la requête (device_id et token)
    const urlParams = new URLSearchParams(req.url.split('?')[1])
    const deviceId = urlParams.get('device_id')
    const token = urlParams.get('token') // On suppose que le token est passé dans l'URL sous forme de query string

    if (!deviceId || !token) {
      console.error("❌ Aucun device_id ou token fourni")
      ws.send(JSON.stringify({ error: "Aucun device_id ou token fourni" }))
      ws.close()
      return
    }

    // Vérification du JWT
    const decoded = authenticateJWT(token)
    if (!decoded) {
      console.error("❌ Token invalide ou expiré")
      ws.send(JSON.stringify({ error: "Token invalide ou expiré" }))
      ws.close()
      return
    }

    // Vérification que l'utilisateur est bien admin
    if (decoded.type !== 'admin') {
      console.error("❌ Accès refusé, seul un admin peut accéder au WebSocket")
      ws.send(JSON.stringify({ error: "Accès refusé, seul un admin peut accéder au WebSocket" }))
      ws.close()
      return
    }

    console.log(`✅ Token valide pour l'utilisateur ${decoded.sub}, type : ${decoded.type}`)

    console.log(`✅ Client connecté : ${deviceId}`)

    // Envoi des données en temps réel pour chaque capteur
    const intervalId = setInterval(async () => {
      try {
        // Liste des capteurs que tu veux surveiller
        const sensorNames = ['temperature', 'humidity', 'pressure'] // Remplace par tes capteurs réels

        for (const sensorName of sensorNames) {
          // Récupère la dernière donnée connue
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
