const mongoose = require('mongoose')
const Device = require('../models/Device')

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

seed()
