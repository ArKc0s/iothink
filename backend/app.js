const fs = require('fs');
const https = require('https');
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');

const deviceRoutes = require('./routes/device');
const mqttRoutes = require('./routes/mqtt');
const sensorRoutes = require('./routes/sensor');
const authRoutes = require('./routes/auth');

const setupSwagger = require('./swagger');
const {updateInactiveDevices} = require('./services/deviceMaintenanceService');

const app = express();
const port = 3000;

// Certificats
const options = {
  key: fs.readFileSync('/certs/backend.key'),
  cert: fs.readFileSync('/certs/backend.crt')
};

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:4200", "https://localhost:5173"], 
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Appliqué uniquement à certaines routes sensibles côté front
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives, réessayez plus tard.' }
});


setupSwagger(app);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: "admin"
});

// Middleware de log
app.use(morgan('dev'));
app.use(helmet());

app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use('/devices/register', authLimiter);
app.use('/login', authLimiter);
app.use('/refresh', authLimiter);

app.use('/devices', express.json(), deviceRoutes);
app.use('/mqtt', mqttRoutes);
app.use('/sensors', express.json(), sensorRoutes);
app.use('/', express.json(), authRoutes);

// Vérifie toutes les minutes
setInterval(() => {
  updateInactiveDevices(1); // Inactif après 1 min sans contact
}, 60 * 1000);

https.createServer(options, app).listen(port, () => {
  console.log(`✅ Secure backend running at https://localhost:${port}`);
});
