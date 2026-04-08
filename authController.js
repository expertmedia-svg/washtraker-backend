const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('./models/User');
const SyncLog = require('./models/SyncLog');
const Menage  = require('./models/Menage');
const ActivityLog = require('./models/ActivityLog');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRES = '8h';
const REFRESH_EXPIRES = '30d';

// ── Login ─────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password, device_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), statut: 'actif' })
      .select('+password_hash');

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const payload = { userId: user._id, role: user.role };
    const token        = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

    await User.updateOne({ _id: user._id }, { device_id: device_id || null, last_login: new Date() });

    await ActivityLog.create({ user_id: user._id, action: 'LOGIN', ip_address: req.ip });

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id:       user._id,
        nom:      user.nom,
        prenom:   user.prenom,
        email:    user.email,
        role:     user.role,
        region:   user.region,
        province: user.province,
        commune:  user.commune,
        village:  user.village,
      }
    });

  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requis' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('role statut').lean();

    if (!user || user.statut !== 'actif') {
      return res.status(401).json({ error: 'Utilisateur inactif' });
    }

    const newToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.json({ success: true, token: newToken });
  } catch (err) {
    res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }
};

// ── Créer un utilisateur (admin only) ────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, region, province, commune, village, telephone } = req.body;

    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const validRoles = ['admin', 'atc', 'animateur'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Valeurs: ${validRoles.join(', ')}` });
    }

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      nom, prenom, email: email.toLowerCase(), password_hash: hash,
      role, region, province, commune, village, telephone,
      created_by: req.user.id || req.user._id,
    });

    res.status(201).json({
      success: true,
      data: { id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, commune: user.commune, region: user.region }
    });
  } catch (err) {
    console.error('Erreur createUser:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Me (profil courant) ───────────────────────────────────────────────────
const me = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// ── Changer mot de passe ─────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id || req.user._id).select('+password_hash');
    const match = await bcrypt.compare(oldPassword, user.password_hash);

    if (!match) return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.updateOne({ _id: req.user.id || req.user._id }, { password_hash: newHash });

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Lister tous les utilisateurs ──────────────────────────────────────────
const listUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.statut = status;

    const users = await User.find(filter)
      .select('nom prenom email role statut region province commune village last_login created_at')
      .sort({ role: 1, nom: 1, prenom: 1 })
      .lean();

    // Enrichir avec les compteurs
    const enriched = await Promise.all(users.map(async (u) => {
      const [lastSyncResult, menagesCount] = await Promise.all([
        SyncLog.findOne({ user_id: u._id, sync_status: 'success' }).sort({ completed_at: -1 }).select('completed_at').lean(),
        Menage.countDocuments({ created_by: u._id }),
      ]);
      return {
        ...u,
        id: u._id,
        last_sync: lastSyncResult?.completed_at || null,
        menages_count: menagesCount,
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Erreur listUsers:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { login, refresh, createUser, me, changePassword, listUsers };
