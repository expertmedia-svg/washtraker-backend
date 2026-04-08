require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean)
  || ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://localhost:8081', 'http://127.0.0.1:8081'];

// L'API tourne derriere Nginx en production, il faut donc faire confiance
// au proxy pour que rate-limit et req.ip utilisent X-Forwarded-For.
app.set('trust proxy', 1);

// ── Connexion MongoDB ─────────────────────────────────────────────────────
connectDB();

// ── Sécurité ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' }
}));

// Rate limiting strict pour l'auth
app.use('/api/v1/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion.' }
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // Supporte les syncs batch + photos base64
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development'
}));

// ── Routes API ────────────────────────────────────────────────────────────
app.use('/api/v1', require('./api'));

// ── Gestion des erreurs ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route introuvable: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ error: 'Erreur interne du serveur', ...(process.env.NODE_ENV === 'development' && { details: err.message }) });
});

// ── Démarrage ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   WASH Tracker API — v1.0            ║
║   Port: ${PORT}                          ║
║   Env:  ${(process.env.NODE_ENV || 'development').padEnd(12)}                ║
╚══════════════════════════════════════╝
  `);
});

module.exports = app;
