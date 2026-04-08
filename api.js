const express  = require('express');
const router   = express.Router();
const { authenticate, authorize, restrictToZone, logActivity } = require('./auth');
const authCtrl   = require('./authController');
const menageCtrl = require('./menageController');
const PointEau = require('./models/PointEau');
const Latrine  = require('./models/Latrine');
const Menage   = require('./models/Menage');
const Infrastructure = require('./models/Infrastructure');
const Ecole    = require('./models/Ecole');

// ── Formule Haversine — distance en mètres entre deux coordonnées GPS ─────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── AUTH ──────────────────────────────────────────────────────────────────
router.post('/auth/login',           authCtrl.login);
router.post('/auth/refresh',         authCtrl.refresh);
router.get ('/auth/me',              authenticate, authCtrl.me);
router.get ('/auth/users',           authenticate, authorize('admin'), authCtrl.listUsers);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);
router.post('/auth/users',           authenticate, authorize('admin'), authCtrl.createUser);

// ── MÉNAGES ───────────────────────────────────────────────────────────────
router.get ('/menages', authenticate, restrictToZone, menageCtrl.listMenages);
router.post('/menages', authenticate, authorize('animateur', 'atc', 'admin'), logActivity('CREATE_MENAGE', 'menage'), menageCtrl.createMenage);
router.patch('/menages/:id/validate', authenticate, authorize('atc', 'admin'), logActivity('VALIDATE_MENAGE', 'menage'), menageCtrl.validateMenage);

// ── SYNCHRONISATION OFFLINE ───────────────────────────────────────────────
router.post('/sync/batch', authenticate, authorize('animateur', 'atc'), logActivity('SYNC_BATCH', 'sync'), menageCtrl.syncBatch);

// ── STATISTIQUES ──────────────────────────────────────────────────────────
router.get('/stats/communes', authenticate, restrictToZone, menageCtrl.getStats);

// ── POINTS D'EAU ─────────────────────────────────────────────────────────
router.get('/points-eau', authenticate, restrictToZone, async (req, res) => {
  try {
    const { commune, type_point_eau, etat, region } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') {
      filter.commune = req.user.commune;
    } else {
      if (commune) filter.commune = commune;
      if (region) filter.region = region;
    }
    if (type_point_eau) filter.type_point_eau = type_point_eau;
    if (etat) filter.etat = etat;

    const data = await PointEau.find(filter)
      .populate('created_by', 'nom prenom')
      .sort({ created_at: -1 })
      .lean();

    const enriched = data.map(pe => ({
      ...pe, id: pe._id,
      animateur_nom: pe.created_by?.nom,
      animateur_prenom: pe.created_by?.prenom,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/points-eau', authenticate, authorize('animateur','atc','admin'), async (req, res) => {
  try {
    const pe = await PointEau.create({
      ...req.body,
      collected_offline: req.body.collected_offline || false,
      sync_id: req.body.sync_id || null,
      created_by: req.user.id || req.user._id,
    });
    res.status(201).json({ success: true, data: pe });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'sync_id dupliqué' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/points-eau/:id/validate', authenticate, authorize('atc','admin'), async (req, res) => {
  try {
    const { action, commentaire } = req.body;
    if (!['valide','rejete'].includes(action)) return res.status(400).json({ error: 'Action invalide' });
    const pe = await PointEau.findByIdAndUpdate(req.params.id, {
      statut: action,
      commentaire_rejet: commentaire || null,
      validated_by: req.user.id || req.user._id,
      validated_at: new Date(),
    }, { new: true });
    res.json({ success: true, data: pe });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── LATRINES ──────────────────────────────────────────────────────────────
router.get('/latrines', authenticate, restrictToZone, async (req, res) => {
  try {
    const { commune, etat, type_latrine, statut } = req.query;
    const filter = {};

    if (etat) filter.etat = etat;
    if (type_latrine) filter.type_latrine = type_latrine;
    if (statut) filter.statut = statut;

    let data = await Latrine.find(filter)
      .populate({ path: 'menage_id', select: 'commune region village' })
      .populate('created_by', 'nom prenom')
      .sort({ created_at: -1 })
      .lean();

    // Filtrer par commune du ménage
    if (req.user.role !== 'admin') {
      data = data.filter(l => l.menage_id?.commune === req.user.commune);
    } else if (commune) {
      data = data.filter(l => l.menage_id?.commune === commune);
    }

    const enriched = data.map(l => ({
      ...l, id: l._id,
      commune: l.menage_id?.commune,
      region: l.menage_id?.region,
      village: l.menage_id?.village,
      animateur_nom: l.created_by?.nom,
      animateur_prenom: l.created_by?.prenom,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/latrines', authenticate, authorize('animateur','atc','admin'), async (req, res) => {
  try {
    const latrine = await Latrine.create({
      ...req.body,
      collected_offline: req.body.collected_offline || false,
      sync_id: req.body.sync_id || null,
      created_by: req.user.id || req.user._id,
    });
    res.status(201).json({ success: true, data: latrine });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'sync_id dupliqué' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/latrines/:id/validate', authenticate, authorize('atc','admin'), async (req, res) => {
  try {
    const { action, commentaire } = req.body;
    if (!['valide','rejete'].includes(action)) return res.status(400).json({ error: 'Action invalide' });
    const latrine = await Latrine.findByIdAndUpdate(req.params.id, {
      statut: action,
      commentaire_rejet: commentaire || null,
      validated_by: req.user.id || req.user._id,
      validated_at: new Date(),
    }, { new: true });
    res.json({ success: true, data: latrine });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── INFRASTRUCTURES ───────────────────────────────────────────────────────
router.get('/infrastructures', authenticate, restrictToZone, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') filter.commune = req.user.commune;

    const data = await Infrastructure.find(filter)
      .populate('created_by', 'nom')
      .sort({ created_at: -1 })
      .lean();

    const enriched = data.map(i => ({
      ...i, id: i._id,
      animateur_nom: i.created_by?.nom,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/infrastructures', authenticate, authorize('animateur','atc','admin'), async (req, res) => {
  try {
    const infra = await Infrastructure.create({
      ...req.body,
      collected_offline: req.body.collected_offline || false,
      sync_id: req.body.sync_id || null,
      created_by: req.user.id || req.user._id,
    });
    res.status(201).json({ success: true, data: infra });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/infrastructures/:id/validate', authenticate, authorize('atc','admin'), async (req, res) => {
  try {
    const { action, commentaire } = req.body;
    if (!['valide','rejete'].includes(action)) return res.status(400).json({ error: 'Action invalide' });
    const infra = await Infrastructure.findByIdAndUpdate(req.params.id, {
      statut: action,
      commentaire_rejet: commentaire || null,
      validated_by: req.user.id || req.user._id,
      validated_at: new Date(),
    }, { new: true });
    res.json({ success: true, data: infra });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── CARTOGRAPHIE — Tous les points géolocalisés ───────────────────────────
router.get('/map/points', authenticate, async (req, res) => {
  try {
    const communeFilter = req.user.role !== 'admin' ? { commune: req.user.commune } : {};

    const [menages, pointsEau, infras, ecoles] = await Promise.all([
      Menage.find({ ...communeFilter, gps_latitude: { $ne: null }, statut: 'valide' })
        .select('nom_chef gps_latitude gps_longitude commune region pratique_defecation village_odf')
        .limit(2000).lean(),
      PointEau.find({ ...communeFilter, statut: 'valide' })
        .select('nom type_point_eau gps_latitude gps_longitude commune region etat')
        .lean(),
      Infrastructure.find({ ...communeFilter, statut: 'valide' })
        .select('nom type_infra gps_latitude gps_longitude commune region etat')
        .lean(),
      Ecole.find({ ...communeFilter, statut: 'valide' })
        .select('nom type_ecole gps_latitude gps_longitude commune region latrine_existe point_eau_existe nombre_eleves')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        menages: menages.map(m => ({ id: m._id, nom: m.nom_chef, gps_latitude: m.gps_latitude, gps_longitude: m.gps_longitude, commune: m.commune, region: m.region, type: 'menage', etat: m.village_odf ? 'odf' : (m.pratique_defecation === 'air_libre' ? 'risque' : 'ok') })),
        points_eau: pointsEau.map(pe => ({ id: pe._id, nom: pe.nom || pe.type_point_eau, gps_latitude: pe.gps_latitude, gps_longitude: pe.gps_longitude, commune: pe.commune, region: pe.region, type: 'point_eau', etat: pe.etat })),
        infras: infras.map(i => ({ id: i._id, nom: i.nom, gps_latitude: i.gps_latitude, gps_longitude: i.gps_longitude, commune: i.commune, region: i.region, type: i.type_infra, etat: i.etat })),
        ecoles: ecoles.map(e => ({ id: e._id, nom: e.nom, gps_latitude: e.gps_latitude, gps_longitude: e.gps_longitude, commune: e.commune, region: e.region, type: 'ecole', nb_eleves: e.nombre_eleves, latrine: e.latrine_existe, eau: e.point_eau_existe })),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── ÉCOLES — WASH in Schools (WinS) ──────────────────────────────────────
router.get('/ecoles', authenticate, restrictToZone, async (req, res) => {
  try {
    const { commune, type_ecole, statut, region } = req.query;
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.commune = req.user.commune;
    } else {
      if (commune) filter.commune = commune;
      if (region) filter.region = region;
    }
    if (type_ecole) filter.type_ecole = type_ecole;
    if (statut) filter.statut = statut;

    const data = await Ecole.find(filter)
      .populate('created_by', 'nom prenom')
      .sort({ created_at: -1 })
      .lean();

    const enriched = data.map(e => ({
      ...e, id: e._id,
      animateur_nom: e.created_by?.nom,
      animateur_prenom: e.created_by?.prenom,
    }));

    res.json({ success: true, data: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/ecoles', authenticate, authorize('animateur', 'atc', 'admin'), logActivity('CREATE_ECOLE', 'ecole'), async (req, res) => {
  try {
    const ecole = await Ecole.create({
      ...req.body,
      collected_offline: req.body.collected_offline || false,
      sync_id: req.body.sync_id || null,
      created_by: req.user.id || req.user._id,
    });
    res.status(201).json({ success: true, data: ecole });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'sync_id dupliqué' });
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/ecoles/:id/validate', authenticate, authorize('atc', 'admin'), logActivity('VALIDATE_ECOLE', 'ecole'), async (req, res) => {
  try {
    const { action, commentaire } = req.body;
    if (!['valide', 'rejete'].includes(action)) return res.status(400).json({ error: 'Action invalide' });
    const ecole = await Ecole.findByIdAndUpdate(req.params.id, {
      statut: action,
      commentaire_rejet: commentaire || null,
      validated_by: req.user.id || req.user._id,
      validated_at: new Date(),
    }, { new: true });
    if (!ecole) return res.status(404).json({ error: 'École introuvable' });
    res.json({ success: true, data: ecole });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PROXIMITÉ — Calcul de distances Haversine ─────────────────────────────
// GET /api/v1/proximite?lat=12.37&lng=-1.52&commune=Ouagadougou
// Retourne les entités validées les plus proches avec leur distance en mètres
router.get('/proximite', authenticate, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const commune = req.query.commune || req.user.commune;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Paramètres lat/lng invalides' });
    }

    const filter = { statut: 'valide' };
    if (req.user.role !== 'admin') filter.commune = req.user.commune;
    else if (commune) filter.commune = commune;

    const [pointsEau, menages, ecoles] = await Promise.all([
      PointEau.find(filter).select('nom type_point_eau gps_latitude gps_longitude etat commune village').lean(),
      Menage.find({ ...filter, gps_latitude: { $ne: null } }).select('nom_chef gps_latitude gps_longitude commune village pratique_defecation').lean(),
      Ecole.find(filter).select('nom type_ecole gps_latitude gps_longitude latrine_existe point_eau_existe nombre_eleves commune village').lean(),
    ]);

    const withDist = (arr, nomFn) => arr
      .map(e => ({ ...e, id: e._id, nom: nomFn(e), distance_m: haversineDistance(lat, lng, e.gps_latitude, e.gps_longitude) }))
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 5);

    const pointsEauProches = withDist(pointsEau, pe => pe.nom || pe.type_point_eau);
    const menagesProches   = withDist(menages, m => m.nom_chef);
    const ecolesProches    = withDist(ecoles, e => e.nom);

    // Statistiques de la commune
    const stats = {
      nb_points_eau_500m: pointsEauProches.filter(p => p.distance_m <= 500).length,
      nb_ecoles_500m:     ecolesProches.filter(e => e.distance_m <= 500).length,
      point_eau_le_plus_proche_m: pointsEauProches[0]?.distance_m ?? null,
      ecole_la_plus_proche_m:     ecolesProches[0]?.distance_m ?? null,
    };

    res.json({
      success: true,
      data: {
        reference: { lat, lng },
        points_eau_proches:  pointsEauProches,
        menages_proches:     menagesProches,
        ecoles_proches:      ecolesProches,
        stats,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── STATISTIQUES PAR VILLAGE — Indicateurs ATPC/SNV ─────────────────────
// GET /api/v1/stats/villages?commune=X&region=Y
router.get('/stats/villages', authenticate, async (req, res) => {
  try {
    const matchFilter = { statut: 'valide' };
    if (req.user.role !== 'admin') matchFilter.commune = req.user.commune;
    else if (req.query.commune) matchFilter.commune = req.query.commune;
    if (req.query.region && req.user.role === 'admin') matchFilter.region = req.query.region;

    const [menagesAgg, latrinesAgg, pointsEauAgg, ecolesAgg] = await Promise.all([
      // Agrégation ménages par village
      Menage.aggregate([
        { $match: matchFilter },
        { $group: {
          _id: { village: '$village', commune: '$commune', region: '$region' },
          nb_menages: { $sum: 1 },
          nb_personnes: { $sum: '$nombre_personnes' },
          nb_eau_potable: { $sum: { $cond: ['$eau_potable_acces', 1, 0] } },
          nb_lavage_mains: { $sum: { $cond: ['$lavage_mains_savon', 1, 0] } },
          nb_pratique_air_libre: { $sum: { $cond: [{ $eq: ['$pratique_defecation', 'air_libre'] }, 1, 0] } },
          nb_membre_atpc: { $sum: { $cond: ['$membre_atpc', 1, 0] } },
          village_odf: { $max: { $cond: ['$village_odf', 1, 0] } },
          dist_moy_eau: { $avg: '$distance_point_eau_m' },
        }},
        { $sort: { '_id.commune': 1, '_id.village': 1 } },
      ]),
      // Latrines валide par village (via ménage)
      Latrine.aggregate([
        { $match: { statut: 'valide' } },
        { $lookup: { from: 'menages', localField: 'menage_id', foreignField: '_id', as: 'menage' } },
        { $unwind: '$menage' },
        { $match: { 'menage.statut': 'valide' } },
        { $group: {
          _id: { village: '$menage.village', commune: '$menage.commune' },
          nb_latrines: { $sum: 1 },
          nb_bon_etat: { $sum: { $cond: [{ $eq: ['$etat', 'bon'] }, 1, 0] } },
        }},
      ]),
      // Points d'eau par village
      PointEau.aggregate([
        { $match: { statut: 'valide' } },
        { $group: {
          _id: { village: '$village', commune: '$commune' },
          nb_points_eau: { $sum: 1 },
          nb_fonctionnels: { $sum: { $cond: [{ $in: ['$etat', ['bon', 'moyen']] }, 1, 0] } },
        }},
      ]),
      // Écoles par village
      Ecole.aggregate([
        { $match: matchFilter },
        { $group: {
          _id: { village: '$village', commune: '$commune' },
          nb_ecoles: { $sum: 1 },
          nb_avec_latrine: { $sum: { $cond: ['$latrine_existe', 1, 0] } },
          nb_avec_eau: { $sum: { $cond: ['$point_eau_existe', 1, 0] } },
          nb_latrine_genre: { $sum: { $cond: ['$latrine_separee_genre', 1, 0] } },
          nb_eleves_total: { $sum: '$nombre_eleves' },
        }},
      ]),
    ]);

    // Fusionner toutes les données par village
    const villageMap = {};
    for (const m of menagesAgg) {
      const key = `${m._id.commune}__${m._id.village || ''}`;
      villageMap[key] = {
        village: m._id.village || '(Non précisé)',
        commune: m._id.commune,
        region: m._id.region,
        nb_menages: m.nb_menages,
        nb_personnes: m.nb_personnes,
        nb_eau_potable: m.nb_eau_potable,
        taux_eau_potable: m.nb_menages > 0 ? Math.round(m.nb_eau_potable / m.nb_menages * 100) : 0,
        nb_lavage_mains: m.nb_lavage_mains,
        taux_lavage_mains: m.nb_menages > 0 ? Math.round(m.nb_lavage_mains / m.nb_menages * 100) : 0,
        nb_pratique_air_libre: m.nb_pratique_air_libre,
        taux_defecation_air_libre: m.nb_menages > 0 ? Math.round(m.nb_pratique_air_libre / m.nb_menages * 100) : 0,
        nb_membre_atpc: m.nb_membre_atpc,
        village_odf: m.village_odf === 1,
        dist_moy_point_eau_m: m.dist_moy_eau ? Math.round(m.dist_moy_eau) : null,
        nb_latrines: 0, nb_latrines_bon_etat: 0, taux_couverture_latrine: 0,
        nb_points_eau: 0, nb_points_eau_fonctionnels: 0,
        nb_ecoles: 0, nb_ecoles_avec_latrine: 0, nb_ecoles_avec_eau: 0, nb_eleves_total: 0,
      };
    }

    for (const l of latrinesAgg) {
      const key = `${l._id.commune}__${l._id.village || ''}`;
      if (villageMap[key]) {
        villageMap[key].nb_latrines = l.nb_latrines;
        villageMap[key].nb_latrines_bon_etat = l.nb_bon_etat;
        villageMap[key].taux_couverture_latrine = villageMap[key].nb_menages > 0 ? Math.round(l.nb_latrines / villageMap[key].nb_menages * 100) : 0;
      }
    }

    for (const pe of pointsEauAgg) {
      const key = `${pe._id.commune}__${pe._id.village || ''}`;
      if (villageMap[key]) {
        villageMap[key].nb_points_eau = pe.nb_points_eau;
        villageMap[key].nb_points_eau_fonctionnels = pe.nb_fonctionnels;
      }
    }

    for (const e of ecolesAgg) {
      const key = `${e._id.commune}__${e._id.village || ''}`;
      if (villageMap[key]) {
        villageMap[key].nb_ecoles = e.nb_ecoles;
        villageMap[key].nb_ecoles_avec_latrine = e.nb_avec_latrine;
        villageMap[key].nb_ecoles_avec_eau = e.nb_avec_eau;
        villageMap[key].nb_eleves_total = e.nb_eleves_total;
      }
    }

    const result = Object.values(villageMap);
    res.json({ success: true, data: result, total: result.length });
  } catch (err) {
    console.error('Erreur stats/villages:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── EXPORT EXCEL / PDF ────────────────────────────────────────────────────
router.get('/export/excel', authenticate, authorize('admin', 'atc'), async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Utilisez /stats/communes ou /stats/villages pour les données export' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur export' });
  }
});

module.exports = router;
