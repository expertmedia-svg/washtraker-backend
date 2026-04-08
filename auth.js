const jwt = require('jsonwebtoken');
const User = require('./models/User');
const ActivityLog = require('./models/ActivityLog');

// ── Vérification du token JWT ──────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ _id: decoded.userId, statut: 'actif' })
      .select('nom prenom email role statut region province commune village')
      .lean();

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou inactif' });
    }

    user.id = user._id;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ── Autorisation par rôle ─────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Accès refusé. Rôles autorisés: ${roles.join(', ')}`
    });
  }
  next();
};

// ── Restriction géographique (ATC = commune seulement) ───────────────────
const restrictToZone = (req, res, next) => {
  if (req.user.role === 'admin') return next();

  if (req.user.commune) {
    req.zoneFilter = { commune: req.user.commune };
  }
  if (req.user.role === 'animateur' && req.user.village) {
    req.zoneFilter = { ...req.zoneFilter, village: req.user.village };
  }
  next();
};

// ── Log d'activité ──────────────────────────────────────────────────────
const logActivity = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode < 400 && req.user) {
      ActivityLog.create({
        user_id: req.user.id || req.user._id,
        action,
        entity_type: entityType,
        entity_id: data?.data?.id || data?.data?._id || req.params.id || null,
        details: { method: req.method, path: req.path },
        ip_address: req.ip,
      }).catch(console.error);
    }
    return originalJson(data);
  };
  next();
};

module.exports = { authenticate, authorize, restrictToZone, logActivity };
