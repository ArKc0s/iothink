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
  } catch (err) {
    console.error('[✘] Failed to seed MongoDB:', err)
  }
}

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI)

  const existing = await Admin.findOne({ username: 'admin' })
  if (existing) {
    console.log('Admin already exists')
    return
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
  const admin = new Admin({ username: 'admin', passwordHash })

  await admin.save()
  console.log('Admin seeded successfully')

}

async function main() {
  try {
    await seed()
    await seedAdmin()
    process.exit(0)
  } catch (err) {
    console.error('[✘] Failed during seeding:', err)
    process.exit(1)
  }
}

main()


