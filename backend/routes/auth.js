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
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' })
  }

  try {
    const admin = await Admin.findOne({ email })

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const match = await bcrypt.compare(password, admin.password)
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { sub: admin._id.toString(), type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    )

    return res.status(200).json({ token })
  } catch (err) {
    console.error('[LOGIN ERROR]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
