const jwt = require('jsonwebtoken')

function authenticateJWT(req, res, next) {
    const authHeader = req.headers['authorization']
    if (!authHeader) return res.status(401).json({ error: 'Missing token' })
  
    const token = authHeader.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Invalid token format' })
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.auth = decoded  // contient sub + type
      next()
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
  }
module.exports = authenticateJWT
  