import express from 'express';
import morgan from 'morgan';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev')); // Affiche les requêtes dans la console
app.use(express.urlencoded({ extended: true })); // Pour parser les requêtes POST x-www-form-urlencoded

// Endpoint /mqtt/auth
app.post('/mqtt/auth', (req, res) => {
  console.log('[AUTH]', req.body);
  const { username, password } = req.body;

  // Répondre OK si tu veux autoriser temporairement tous les devices
  res.send('OK');
});

// Endpoint /mqtt/superuser
app.post('/mqtt/superuser', (req, res) => {
  console.log('[SUPERUSER]', req.body);
  res.send('ERROR'); // Aucun superuser ici
});

// Endpoint /mqtt/acl
app.post('/mqtt/acl', (req, res) => {
  console.log('[ACL]', req.body);
  const { username, topic, acc } = req.body;

  // Autoriser si le device publie dans son propre topic
  if (topic.startsWith(`capteurs/${username}`)) {
    res.send('OK');
  } else {
    res.send('ERROR');
  }
});

app.listen(port, () => {
  console.log(`🚀 MQTT HTTP backend listening on port ${port}`);
});