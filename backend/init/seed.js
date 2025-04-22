const mongoose = require('mongoose')
const Device = require('../models/Device')
const Admin = require('../models/Admin')
const bcrypt = require('bcrypt')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/iothink'
const TELEGRAPH_API_KEY = process.env.TELEGRAPH_API_KEY

if (!TELEGRAPH_API_KEY) {
  console.error('[✘] TELEGRAPH_API_KEY must be defined in environment')
  process.exit(1)
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    const existing = await Device.findOne({ device_id: 'telegraf' })

    if (!existing) {
      await Device.create({
        device_id: 'telegraf',
        mac: 'N/A',
        api_key: TELEGRAPH_API_KEY,
        authorized: true,
        created_at: new Date(),
        status: 'active'
      })

      console.log(`[✔] Device "telegraf" initialized`)
    } else {
      console.log(`[i] Device "telegraf" already exists.`)
    }

    process.exit(0)
  } catch (err) {
    console.error('[✘] Failed to seed MongoDB:', err)
    process.exit(1)
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    const existing = await Admin.findOne({ email })
    if (existing) {
      console.log('✅ Admin already exists:', email)
    } else {
      const hash = await bcrypt.hash(password, 10)

      await Admin.create({ email, password: hash })
      console.log('✅ Admin seeded:', email)
    }
  } catch (err) {
    console.error('❌ Error seeding admin:', err)
  } finally {
    mongoose.connection.close()
  }
}

seed()
seedAdmin()


