const WebSocket = require('ws')
const { getSensorsStatus, getSensorData } = require('../services/influxService')

module.exports = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws/sensor' })

  wss.on('connection', async (ws, req) => {
    const deviceId = req.url.split('/').pop()
    console.log(`✅ Client connecté : ${deviceId}`)

    try {
      // Récupère tous les capteurs actifs du device
      const status = await getSensorsStatus(deviceId)
      const activeSensors = status.active

      console.log(`🔄 Capteurs actifs pour ${deviceId} :`, activeSensors)

      // Vérifie qu'il y a des capteurs actifs
      if (activeSensors.length === 0) {
        ws.send(JSON.stringify({ error: `Aucun capteur actif pour ${deviceId}` }))
        ws.close()
        return
      }

      // Envoi des données en temps réel pour chaque capteur actif
      const intervalId = setInterval(async () => {
        for (const sensor of activeSensors) {
          try {
            // Récupère la dernière valeur connue pour chaque capteur
            const data = await getSensorData(deviceId, sensor, '-1m', 'now()', '10s')
            const latest = data.length > 0 ? data[data.length - 1] : null

            if (latest) {
              const message = JSON.stringify({
                sensor,
                value: latest._value,
                timestamp: latest._time
              })
              ws.send(message)
            }
          } catch (err) {
            console.error(`[WebSocket] Erreur lors de la récupération des données pour ${sensor} :`, err)
          }
        }
      }, 5000)

      ws.on('close', () => {
        clearInterval(intervalId)
        console.log(`❌ Client déconnecté : ${deviceId}`)
      })

      ws.on('error', (err) => {
        console.error(`⚠️ Erreur WebSocket : ${err.message}`)
      })

    } catch (err) {
      console.error(`[WebSocket] Erreur lors de la récupération des capteurs pour ${deviceId} :`, err)
      ws.send(JSON.stringify({ error: 'Erreur lors de la récupération des capteurs' }))
      ws.close()
    }
  })
}
