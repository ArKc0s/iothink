const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
  email: String,
  password: String, // Hashé idéalement (ex: bcrypt)
})

module.exports = mongoose.model('Admin', adminSchema)
