const express = require('express')
const jwt = require('jsonwebtoken')
const Admin = require('../models/Admin')
const bcrypt = require('bcrypt')

const router = express.Router()

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Connexion administrateur
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne un JWT
 *       401:
 *         description: Identifiants incorrects
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })

  const admin = await Admin.findOne({ username })
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const accessToken = jwt.sign({ sub: admin._id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
  const refreshToken = jwt.sign({ sub: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

  admin.refreshToken = refreshToken
  await admin.save()

  return res.json({ accessToken, refreshToken })
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' })

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET)
    const admin = await Admin.findById(payload.sub)

    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid refresh token' })
    }

    const newAccessToken = jwt.sign({ sub: admin._id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
    return res.json({ accessToken: newAccessToken })
  } catch (err) {
    return res.status(403).json({ error: 'Token expired or invalid' })
  }
})

module.exports = router

