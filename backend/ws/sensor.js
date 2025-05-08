const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3001 })

wss.on('connection', (ws, req) => {
  const deviceId = req.url.split('/').pop()

  // Simuler l'envoi de données en temps réel
  setInterval(() => {
    const message = JSON.stringify({
      sensor: 'temperature',
      value: (Math.random() * 100).toFixed(2),
      timestamp: new Date().toISOString()
    })
    ws.send(message)
  }, 5000)

  ws.on('close', () => console.log(`Client déconnecté: ${deviceId}`))
})
