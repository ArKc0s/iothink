const WebSocket = require('ws')

module.exports = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws/sensor' })

  wss.on('connection', (ws, req) => {
    const deviceId = req.url.split('/').pop()
    console.log(`✅ Client connecté : ${deviceId}`)

    // Simuler l'envoi de données en temps réel
    const intervalId = setInterval(() => {
      const message = JSON.stringify({
        sensor: 'temperature',
        value: (Math.random() * 100).toFixed(2),
        timestamp: new Date().toISOString()
      })
      ws.send(message)
    }, 5000)

    ws.on('close', () => {
      clearInterval(intervalId)
      console.log(`❌ Client déconnecté : ${deviceId}`)
    })

    ws.on('error', (err) => {
      console.error(`⚠️ Erreur WebSocket : ${err.message}`)
    })
  })
}
