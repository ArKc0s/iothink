const express = require('express');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;

// Middleware de log
app.use(morgan('dev'));

// ⚠️ Ajoute bien les deux lignes ci-dessous
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.post('/mqtt/auth', (req, res) => {
  console.log('[AUTH]', req.body);
  res.send('OK');
});

app.post('/mqtt/superuser', (req, res) => {
  console.log('[SUPERUSER]', req.body);
  res.send('ERROR');
});

app.post('/mqtt/acl', (req, res) => {
  console.log('[ACL]', req.body);
  res.send('OK');
});

app.listen(port, () => {
  console.log(`🚀 MQTT AUTH backend listening on port ${port}`);
});
