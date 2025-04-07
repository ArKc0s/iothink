const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const deviceRoutes = require('./routes/device');
const mqttRoutes = require('./routes/mqtt')


const app = express();
const port = process.env.PORT || 3000;

mongoose.connect('mongodb://mongo:27017/iothink', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Middleware de log
app.use(morgan('dev'));

// ⚠️ Ajoute bien les deux lignes ci-dessous
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/devices', deviceRoutes);
app.use('/mqtt', mqttRoutes);

app.listen(port, () => {
  console.log(`🚀 MQTT AUTH backend listening on port ${port}`);
});
