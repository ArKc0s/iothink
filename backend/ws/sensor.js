
const WebSocket = require('ws')
const { getSensorData } = require('../services/influxService')

module.exports = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws/sensor' })

  console.log("✅ WebSocket server ready")

  wss.on('connection', async (ws, req) => {
    // Récupère le device_id depuis les query parameters
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