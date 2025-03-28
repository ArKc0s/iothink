import mongoose from 'mongoose'

const DeviceSchema = new mongoose.Schema({
  device_id: { type: String, required: true, unique: true },
  mac: { type: String, required: true },
  api_key: { type: String, default: null },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  last_seen: { type: Date, default: null },
  status: { type: String, enum: ['inactive', 'active'], default: 'inactive' },
  authorized: { type: Boolean, default: false }
})

export default mongoose.model('Device', DeviceSchema)