const fs = require('fs');
const https = require('https');
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const winston = require('winston');
const expressWinston = require('express-winston');
const logger = require('./logger');

// Routes
const deviceRoutes = require('./routes/device');
const mqttRoutes = require('./routes/mqtt');
const sensorRoutes = require('./routes/sensor');
const authRoutes = require('./routes/auth');

// Services
const setupSwagger = require('./swagger');
const { updateInactiveDevices } = require('./services/deviceMaintenanceService');

// App initialization
const app = express();
const port = 3000;

// HTTPS certificates (replace with your actual certificate paths)
const options = {
  key: fs.readFileSync('/certs/backend.key'),
  cert: fs.readFileSync('/certs/backend.crt')
};
const server = https.createServer(options, app);
const sensorWs = require('./ws/sensor');

// CORS configuration
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:4200", "https://localhost:5173"],
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Rate limiter for sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Too many attempts, please try again later.' }
});

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: "admin"
}).then(() => {
  logger.info('Connected to MongoDB');
}).catch(err => {
  logger.error('MongoDB connection error:', err);
});

// Middleware setup
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request logging
app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'requests.log') })
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true,
  expressFormat: true,
  colorize: false,
}));

// Routes
app.use('/devices/register', authLimiter);
app.use('/login', authLimiter);
app.use('/refresh', authLimiter);
app.use('/devices', deviceRoutes);
app.use('/mqtt', mqttRoutes);
app.use('/sensors', sensorRoutes);
app.use('/', authRoutes);

// Swagger setup
setupSwagger(app);

// Inactive device check (every 5 minutes)
setInterval(() => {
  updateInactiveDevices(0.25);
}, 5 * 60 * 1000);

// WebSocket setup
sensorWs(server);

// Error logging
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    query: req.query,
  });
  next(err);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Global error handler: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Server startup
server.listen(port, () => {
  logger.info(`Secure backend running at https://localhost:${port}`);
});