const Menage  = require('./models/Menage');
const Latrine = require('./models/Latrine');
const PointEau = require('./models/PointEau');
const Infrastructure = require('./models/Infrastructure');
const SyncLog = require('./models/SyncLog');

// ── Lister les ménages (filtré par zone) ─────────────────────────────────
const listMenages = async (req, res) => {
  try {
    const { commune, region, statut, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (req.user.role === 'atc' || req.user.role === 'animateur') {
      filter.commune = req.user.commune;
    }
    if (req.user.role === 'animateur') {
      filter.created_by = req.user.id || req.user._id;
    }

    if (commune && req.user.role === 'admin') filter.commune = commune;
    if (region && req.user.role === 'admin') filter.region = region;
    if (statut) filter.statut = statut;

    const [data, total] = await Promise.all([
      Menage.find(filter)
        .populate('created_by', 'nom prenom')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Menage.countDocuments(filter),
    ]);

    // Enrichir avec les latrines
    const menageIds = data.map(m => m._id);
    const latrines = await Latrine.find({ menage_id: { $in: menageIds } })
      .select('menage_id existe etat')
      .lean();

    const latrineMap = {};
    latrines.forEach(l => { latrineMap[l.menage_id.toString()] = l; });

    const enriched = data.map(m => ({
      ...m,
      id: m._id,
      animateur_nom: m.created_by?.nom,
      animateur_prenom: m.created_by?.prenom,
      latrine_existe: latrineMap[m._id.toString()]?.existe || false,
      latrine_etat: latrineMap[m._id.toString()]?.etat || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (err) {
    console.error('listMenages:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Créer un ménage ───────────────────────────────────────────────────────
const createMenage = async (req, res) => {
  try {
    const {
      nom_chef, nombre_personnes,
      gps_latitude, gps_longitude, gps_accuracy,
      region, province, commune, village, quartier,
      collected_offline, sync_id
    } = req.body;

    if (!nom_chef || !nombre_personnes || !commune) {
      return res.status(400).json({ error: 'Champs obligatoires: nom_chef, nombre_personnes, commune' });
    }

    const targetCommune = req.user.role === 'animateur' ? req.user.commune : commune;
    const targetRegion  = req.user.role === 'animateur' ? req.user.region  : region;
    const targetVillage = req.user.role === 'animateur' ? req.user.village : village;

    const menage = await Menage.create({
      nom_chef, nombre_personnes,
      gps_latitude, gps_longitude, gps_accuracy,
      region: targetRegion, province, commune: targetCommune, village: targetVillage, quartier,
      statut: 'en_attente',
      collected_offline: collected_offline || false,
      sync_id: sync_id || null,
      created_by: req.user.id || req.user._id,
    });

    res.status(201).json({ success: true, data: menage });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'sync_id déjà existant', code: 'DUPLICATE_SYNC_ID' });
    }
    console.error('createMenage:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Valider / Rejeter un ménage (ATC + Admin) ─────────────────────────────
const validateMenage = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, commentaire } = req.body;

    if (!['valide', 'rejete'].includes(action)) {
      return res.status(400).json({ error: 'Action invalide: valide ou rejete' });
    }
    if (action === 'rejete' && !commentaire) {
      return res.status(400).json({ error: 'Commentaire de rejet obligatoire' });
    }

    const menage = await Menage.findById(id);
    if (!menage) return res.status(404).json({ error: 'Ménage introuvable' });

    if (menage.statut !== 'en_attente') {
      return res.status(400).json({ error: `Ménage déjà ${menage.statut}` });
    }
    if (req.user.role === 'atc' && menage.commune !== req.user.commune) {
      return res.status(403).json({ error: 'Hors de votre commune' });
    }

    menage.statut = action;
    menage.commentaire_rejet = commentaire || null;
    menage.validated_by = req.user.id || req.user._id;
    menage.validated_at = new Date();
    await menage.save();

    res.json({ success: true, data: menage });
  } catch (err) {
    console.error('validateMenage:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Synchronisation en masse (offline → online) ───────────────────────────
const syncBatch = async (req, res) => {
  const session = await require('mongoose').startSession();
  try {
    session.startTransaction();
    const { menages = [], latrines = [], points_eau = [], infrastructures = [], ecoles = [], device_id } = req.body;

    const syncLog = await SyncLog.create([{
      user_id: req.user.id || req.user._id,
      device_id: device_id || 'unknown',
      sync_status: 'pending',
    }], { session });
    const syncId = syncLog[0]._id;

    const results = { inserted: 0, skipped: 0, errors: [] };
    const userId = req.user.id || req.user._id;
    const menageIdBySyncId = new Map();

    for (const m of menages) {
      try {
        const exists = m.sync_id ? await Menage.findOne({ sync_id: m.sync_id }).session(session) : null;
        if (exists) {
          if (m.sync_id) menageIdBySyncId.set(m.sync_id, exists._id);
          results.skipped++;
          continue;
        }
        const created = await Menage.create([{
          nom_chef: m.nom_chef, nombre_personnes: m.nombre_personnes,
          gps_latitude: m.gps_latitude, gps_longitude: m.gps_longitude,
          gps_accuracy: m.gps_accuracy,
          region: m.region, province: m.province, commune: m.commune, village: m.village,
          quartier: m.quartier,
          pratique_defecation: m.pratique_defecation,
          eau_potable_acces: m.eau_potable_acces,
          distance_point_eau_m: m.distance_point_eau_m,
          lavage_mains_apres_wc: m.lavage_mains_apres_wc,
          lavage_mains_savon: m.lavage_mains_savon,
          lave_mains_existe: m.lave_mains_existe,
          membre_atpc: m.membre_atpc,
          village_odf: m.village_odf,
          gestion_ordures: m.gestion_ordures,
          statut: 'en_attente', collected_offline: true, sync_id: m.sync_id,
          created_by: userId,
        }], { session });
        if (m.sync_id) menageIdBySyncId.set(m.sync_id, created[0]._id);
        results.inserted++;
      } catch (e) {
        results.errors.push({ sync_id: m.sync_id, error: e.message });
      }
    }

    for (const l of latrines) {
      try {
        const exists = l.sync_id ? await Latrine.findOne({ sync_id: l.sync_id }).session(session) : null;
        if (exists) { results.skipped++; continue; }
        const linkedMenageId = l.menage_sync_id
          ? menageIdBySyncId.get(l.menage_sync_id)
            || (await Menage.findOne({ sync_id: l.menage_sync_id }).session(session))?._id
          : null;
        if (!linkedMenageId) throw new Error('Menage parent introuvable pour la latrine');
        await Latrine.create([{
          menage_id: linkedMenageId, existe: l.existe, type_latrine: l.type_latrine,
          etat: l.etat, nombre_utilisateurs: l.nombre_utilisateurs,
          distance_menage: l.distance_menage,
          superstructure: l.superstructure,
          collected_offline: true, sync_id: l.sync_id, created_by: userId,
        }], { session });
        results.inserted++;
      } catch (e) {
        results.errors.push({ sync_id: l.sync_id, error: e.message });
      }
    }

    for (const pe of points_eau) {
      try {
        const exists = pe.sync_id ? await PointEau.findOne({ sync_id: pe.sync_id }).session(session) : null;
        if (exists) { results.skipped++; continue; }
        await PointEau.create([{
          nom: pe.nom, type_point_eau: pe.type_point_eau, etat: pe.etat,
          gps_latitude: pe.gps_latitude, gps_longitude: pe.gps_longitude, gps_accuracy: pe.gps_accuracy,
          region: pe.region, province: pe.province, commune: pe.commune, village: pe.village,
          annee_construction: pe.annee_construction,
          profondeur_metres: pe.profondeur_metres,
          debit_litre_heure: pe.debit_litre_heure,
          traitement_eau: pe.traitement_eau,
          nombre_menages_desservis: pe.nombre_menages_desservis,
          distance_avg_menages: pe.distance_avg_menages,
          notes: pe.notes,
          collected_offline: true, sync_id: pe.sync_id, created_by: userId,
        }], { session });
        results.inserted++;
      } catch (e) {
        results.errors.push({ sync_id: pe.sync_id, error: e.message });
      }
    }

    for (const inf of infrastructures) {
      try {
        const exists = inf.sync_id ? await Infrastructure.findOne({ sync_id: inf.sync_id }).session(session) : null;
        if (exists) { results.skipped++; continue; }
        await Infrastructure.create([{
          nom: inf.nom, type_infra: inf.type_infra, etat: inf.etat,
          gps_latitude: inf.gps_latitude, gps_longitude: inf.gps_longitude,
          region: inf.region, province: inf.province, commune: inf.commune, village: inf.village,
          a_latrine: inf.a_latrine, a_point_eau: inf.a_point_eau, a_lave_mains: inf.a_lave_mains,
          nombre_usagers: inf.nombre_usagers,
          notes: inf.notes,
          collected_offline: true, sync_id: inf.sync_id, created_by: userId,
        }], { session });
        results.inserted++;
      } catch (e) {
        results.errors.push({ sync_id: inf.sync_id, error: e.message });
      }
    }

    for (const ecole of ecoles) {
      try {
        const exists = ecole.sync_id ? await Ecole.findOne({ sync_id: ecole.sync_id }).session(session) : null;
        if (exists) { results.skipped++; continue; }
        await Ecole.create([{
          nom: ecole.nom,
          type_ecole: ecole.type_ecole,
          statut_gestion: ecole.statut_gestion,
          nombre_eleves: ecole.nombre_eleves,
          nombre_eleves_filles: ecole.nombre_eleves_filles,
          nombre_enseignants: ecole.nombre_enseignants,
          nombre_classes: ecole.nombre_classes,
          gps_latitude: ecole.gps_latitude,
          gps_longitude: ecole.gps_longitude,
          gps_accuracy: ecole.gps_accuracy,
          region: ecole.region,
          province: ecole.province,
          commune: ecole.commune,
          village: ecole.village,
          latrine_existe: ecole.latrine_existe,
          latrine_etat: ecole.latrine_etat,
          latrine_separee_genre: ecole.latrine_separee_genre,
          nombre_latrines_filles: ecole.nb_latrines_filles ?? ecole.nombre_latrines_filles,
          nombre_latrines_garcons: ecole.nb_latrines_garcons ?? ecole.nombre_latrines_garcons,
          latrine_accessible_handicap: ecole.latrine_accessible_handicap,
          point_eau_existe: ecole.point_eau_existe,
          type_point_eau: ecole.type_point_eau,
          eau_potable: ecole.eau_potable,
          eau_disponible_toute_annee: ecole.eau_disponible_toute_annee,
          lave_mains_existe: ecole.lave_mains_existe,
          lave_mains_fonctionnel: ecole.lave_mains_fonctionnel,
          savon_disponible: ecole.savon_disponible,
          club_hygiene_existe: ecole.club_hygiene_existe,
          programme_atpc: ecole.programme_atpc,
          comite_eau_existe: ecole.comite_eau_existe,
          activites_hygiene: ecole.activites_hygiene,
          gestion_dechets: ecole.gestion_dechets,
          distance_point_eau_m: ecole.distance_point_eau_m,
          notes: ecole.notes,
          collected_offline: true,
          sync_id: ecole.sync_id,
          created_by: userId,
        }], { session });
        results.inserted++;
      } catch (e) {
        results.errors.push({ sync_id: ecole.sync_id, error: e.message });
      }
    }

    await SyncLog.updateOne({ _id: syncId }, {
      sync_status: 'success',
      menages_synced: menages.length,
      latrines_synced: latrines.length,
      points_eau_synced: points_eau.length,
      infras_synced: infrastructures.length,
      ecoles_synced: ecoles.length,
      errors_count: results.errors.length,
      error_details: results.errors,
      completed_at: new Date(),
    }, { session });

    await session.commitTransaction();
    res.json({ success: true, results, syncLogId: syncId });
  } catch (err) {
    await session.abortTransaction();
    console.error('syncBatch:', err);
    res.status(500).json({ error: 'Erreur de synchronisation' });
  } finally {
    session.endSession();
  }
};

// ── Statistiques par commune (agrégation MongoDB) ─────────────────────────
const getStats = async (req, res) => {
  try {
    const { region, commune } = req.query;
    const matchFilter = { statut: 'valide' };

    if (req.user.role === 'atc') {
      matchFilter.commune = req.user.commune;
    } else {
      if (region) matchFilter.region = region;
      if (commune) matchFilter.commune = commune;
    }

    const stats = await Menage.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'latrines',
          localField: '_id',
          foreignField: 'menage_id',
          as: 'latrine',
          pipeline: [{ $match: { statut: 'valide' } }],
        }
      },
      { $unwind: { path: '$latrine', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { commune: '$commune', region: '$region' },
          total_menages: { $sum: 1 },
          menages_avec_latrine: { $sum: { $cond: [{ $eq: ['$latrine.existe', true] }, 1, 0] } },
          latrines_bon_etat: { $sum: { $cond: [{ $eq: ['$latrine.etat', 'bon'] }, 1, 0] } },
        }
      },
      { $sort: { '_id.region': 1, '_id.commune': 1 } },
    ]);

    // Points d'eau par commune
    const peFilter = { statut: 'valide' };
    if (matchFilter.commune) peFilter.commune = matchFilter.commune;
    if (matchFilter.region) peFilter.region = matchFilter.region;

    const peStats = await PointEau.aggregate([
      { $match: peFilter },
      {
        $group: {
          _id: { commune: '$commune', region: '$region' },
          total_points_eau: { $sum: 1 },
          points_eau_fonctionnels: { $sum: { $cond: [{ $in: ['$etat', ['bon', 'moyen']] }, 1, 0] } },
        }
      }
    ]);

    const peMap = {};
    peStats.forEach(pe => { peMap[pe._id.commune] = pe; });

    const result = stats.map(s => {
      const pe = peMap[s._id.commune] || {};
      const total = s.total_menages || 1;
      const totalPe = pe.total_points_eau || 1;
      return {
        commune: s._id.commune,
        region: s._id.region,
        total_menages: s.total_menages,
        menages_avec_latrine: s.menages_avec_latrine,
        latrines_bon_etat: s.latrines_bon_etat,
        total_points_eau: pe.total_points_eau || 0,
        points_eau_fonctionnels: pe.points_eau_fonctionnels || 0,
        taux_couverture_latrines: Math.round((s.menages_avec_latrine / total) * 1000) / 10,
        taux_acces_eau: pe.total_points_eau ? Math.round((pe.points_eau_fonctionnels / totalPe) * 1000) / 10 : 0,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('getStats:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { listMenages, createMenage, validateMenage, syncBatch, getStats };
