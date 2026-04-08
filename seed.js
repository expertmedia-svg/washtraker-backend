require('dotenv').config();
const { connectDB, mongoose } = require('./database');
const User = require('./models/User');
const Menage = require('./models/Menage');
const Latrine = require('./models/Latrine');
const PointEau = require('./models/PointEau');
const Infrastructure = require('./models/Infrastructure');
const Ecole = require('./models/Ecole');
const bcrypt = require('bcrypt');

const PRESENTATION_TAG = 'seed-presentation';
const PASSWORDS = {
  admin: 'WashAdmin2025!',
  atc: 'WashAtc2025!',
  animateur: 'WashAnim2025!',
};

const usersSeed = [
  {
    key: 'admin-main',
    email: 'admin@wash-tracker.bf',
    prenom: 'Administrateur',
    nom: 'SNV',
    role: 'admin',
    statut: 'actif',
    region: 'Centre-Sud',
    province: 'Zoundweogo',
    commune: 'Manga',
    village: 'Nagreongo',
    telephone: '+22670000001',
    password: PASSWORDS.admin,
  },
  {
    key: 'admin-presentation',
    email: 'presentation.admin@wash-tracker.bf',
    prenom: 'Aline',
    nom: 'Tapsoba',
    role: 'admin',
    statut: 'actif',
    region: 'Centre-Sud',
    province: 'Nahouri',
    commune: 'Po',
    village: 'Tiebiele',
    telephone: '+22670000002',
    password: PASSWORDS.admin,
  },
  {
    key: 'atc-boromo',
    email: 'atc@wash-tracker.bf',
    prenom: 'Ibrahim',
    nom: 'Ouedraogo',
    role: 'atc',
    statut: 'actif',
    region: 'Boucle du Mouhoun',
    province: 'Bale',
    commune: 'Boromo',
    village: 'Oury',
    telephone: '+22670000003',
    password: PASSWORDS.atc,
  },
  {
    key: 'atc-manga',
    email: 'atc.manga@wash-tracker.bf',
    prenom: 'Awa',
    nom: 'Kabore',
    role: 'atc',
    statut: 'actif',
    region: 'Centre-Sud',
    province: 'Zoundweogo',
    commune: 'Manga',
    village: 'Nagreongo',
    telephone: '+22670000004',
    password: PASSWORDS.atc,
  },
  {
    key: 'anim-oury',
    email: 'animateur@wash-tracker.bf',
    prenom: 'Fatimata',
    nom: 'Compaore',
    role: 'animateur',
    statut: 'actif',
    region: 'Boucle du Mouhoun',
    province: 'Bale',
    commune: 'Boromo',
    village: 'Oury',
    telephone: '+22670000005',
    password: PASSWORDS.animateur,
  },
  {
    key: 'anim-manga',
    email: 'animateur.manga@wash-tracker.bf',
    prenom: 'Mariam',
    nom: 'Diallo',
    role: 'animateur',
    statut: 'actif',
    region: 'Centre-Sud',
    province: 'Zoundweogo',
    commune: 'Manga',
    village: 'Nagreongo',
    telephone: '+22670000006',
    password: PASSWORDS.animateur,
  },
  {
    key: 'anim-po',
    email: 'animateur.po@wash-tracker.bf',
    prenom: 'Rokia',
    nom: 'Yameogo',
    role: 'animateur',
    statut: 'actif',
    region: 'Centre-Sud',
    province: 'Nahouri',
    commune: 'Po',
    village: 'Tiebiele',
    telephone: '+22670000007',
    password: PASSWORDS.animateur,
  },
];

const householdsSeed = [
  {
    key: 'menage-oury-1',
    nom_chef: 'Menage Ouedraogo',
    nombre_personnes: 8,
    region: 'Boucle du Mouhoun',
    province: 'Bale',
    commune: 'Boromo',
    village: 'Oury',
    quartier: 'Secteur 1',
    gps_latitude: 11.7501,
    gps_longitude: -2.9334,
    pratique_defecation: 'latrine_amelioree',
    eau_potable_acces: true,
    distance_point_eau_m: 180,
    lavage_mains_apres_wc: true,
    lavage_mains_savon: true,
    lave_mains_existe: true,
    membre_atpc: true,
    village_odf: true,
    gestion_ordures: 'fosse',
    statut: 'valide',
    createdBy: 'anim-oury',
    validatedBy: 'atc-boromo',
  },
  {
    key: 'menage-oury-2',
    nom_chef: 'Menage Sanou',
    nombre_personnes: 6,
    region: 'Boucle du Mouhoun',
    province: 'Bale',
    commune: 'Boromo',
    village: 'Oury',
    quartier: 'Secteur 2',
    gps_latitude: 11.7513,
    gps_longitude: -2.9318,
    pratique_defecation: 'latrine_couverte',
    eau_potable_acces: true,
    distance_point_eau_m: 220,
    lavage_mains_apres_wc: true,
    lavage_mains_savon: false,
    lave_mains_existe: true,
    membre_atpc: true,
    village_odf: false,
    gestion_ordures: 'brule',
    statut: 'en_attente',
    createdBy: 'anim-oury',
  },
  {
    key: 'menage-manga-1',
    nom_chef: 'Menage Kabore',
    nombre_personnes: 9,
    region: 'Centre-Sud',
    province: 'Zoundweogo',
    commune: 'Manga',
    village: 'Nagreongo',
    quartier: 'Centre',
    gps_latitude: 11.6621,
    gps_longitude: -1.0672,
    pratique_defecation: 'air_libre',
    eau_potable_acces: false,
    distance_point_eau_m: 720,
    lavage_mains_apres_wc: false,
    lavage_mains_savon: false,
    lave_mains_existe: false,
    membre_atpc: false,
    village_odf: false,
    gestion_ordures: 'non_geree',
    statut: 'valide',
    createdBy: 'anim-manga',
    validatedBy: 'atc-manga',
  },
  {
    key: 'menage-manga-2',
    nom_chef: 'Menage Ilboudo',
    nombre_personnes: 5,
    region: 'Centre-Sud',
    province: 'Zoundweogo',
    commune: 'Manga',
    village: 'Nagreongo',
    quartier: 'Est',
    gps_latitude: 11.6644,
    gps_longitude: -1.0637,
    pratique_defecation: 'latrine_couverte',
    eau_potable_acces: true,
    distance_point_eau_m: 260,
    lavage_mains_apres_wc: true,
    lavage_mains_savon: true,
    lave_mains_existe: true,
    membre_atpc: true,
    village_odf: false,
    gestion_ordures: 'fosse',
    statut: 'en_attente',
    createdBy: 'anim-manga',
  },
  {
    key: 'menage-po-1',
    nom_chef: 'Menage Yameogo',
    nombre_personnes: 7,
    region: 'Centre-Sud',
    province: 'Nahouri',
    commune: 'Po',
    village: 'Tiebiele',
    quartier: 'Nord',
    gps_latitude: 11.0973,
    gps_longitude: -1.1459,
    pratique_defecation: 'latrine_amelioree',
    eau_potable_acces: true,
    distance_point_eau_m: 140,
    lavage_mains_apres_wc: true,
    lavage_mains_savon: true,
    lave_mains_existe: true,
    membre_atpc: true,
    village_odf: true,
    gestion_ordures: 'depot_ordures',
    statut: 'valide',
    createdBy: 'anim-po',
    validatedBy: 'admin-main',
  },
  {
    key: 'menage-po-2',
    nom_chef: 'Menage Zongo',
    nombre_personnes: 4,
    region: 'Centre-Sud',
    province: 'Nahouri',
    commune: 'Po',
    village: 'Tiebiele',
    quartier: 'Sud',
    gps_latitude: 11.0994,
    gps_longitude: -1.1492,
    pratique_defecation: 'fosse_ouverte',
    eau_potable_acces: false,
    distance_point_eau_m: 510,
    lavage_mains_apres_wc: false,
    lavage_mains_savon: false,
    lave_mains_existe: false,
    membre_atpc: false,
    village_odf: false,
    gestion_ordures: 'brule',
    statut: 'rejete',
    commentaire_rejet: 'Coordonnees a verifier et hygiene des mains non documentee.',
    createdBy: 'anim-po',
    validatedBy: 'admin-main',
  },
];

const latrinesSeed = [
  { key: 'latrine-oury-1', menageKey: 'menage-oury-1', existe: true, type_latrine: 'fosse_amelioree', etat: 'bon', nombre_utilisateurs: 8, distance_menage: 6, superstructure: true, dalle_integre: true, statut: 'valide', createdBy: 'anim-oury', validatedBy: 'atc-boromo' },
  { key: 'latrine-oury-2', menageKey: 'menage-oury-2', existe: true, type_latrine: 'fosse_simple', etat: 'moyen', nombre_utilisateurs: 6, distance_menage: 8, superstructure: true, dalle_integre: false, statut: 'en_attente', createdBy: 'anim-oury' },
  { key: 'latrine-manga-1', menageKey: 'menage-manga-1', existe: false, type_latrine: 'autre', etat: 'mauvais', nombre_utilisateurs: 9, distance_menage: 0, superstructure: false, dalle_integre: false, statut: 'valide', createdBy: 'anim-manga', validatedBy: 'atc-manga' },
  { key: 'latrine-manga-2', menageKey: 'menage-manga-2', existe: true, type_latrine: 'fosse_simple', etat: 'bon', nombre_utilisateurs: 5, distance_menage: 5, superstructure: true, dalle_integre: true, statut: 'en_attente', createdBy: 'anim-manga' },
  { key: 'latrine-po-1', menageKey: 'menage-po-1', existe: true, type_latrine: 'dalle_sif', etat: 'bon', nombre_utilisateurs: 7, distance_menage: 4, superstructure: true, dalle_integre: true, statut: 'valide', createdBy: 'anim-po', validatedBy: 'admin-main' },
  { key: 'latrine-po-2', menageKey: 'menage-po-2', existe: true, type_latrine: 'fosse_simple', etat: 'mauvais', nombre_utilisateurs: 4, distance_menage: 12, superstructure: false, dalle_integre: false, statut: 'rejete', commentaire_rejet: 'Latrine instable et non securisee.', createdBy: 'anim-po', validatedBy: 'admin-main' },
];

const pointsSeed = [
  { key: 'point-oury-1', nom: 'Forage Oury Centre', type_point_eau: 'forage', etat: 'bon', gps_latitude: 11.7522, gps_longitude: -2.9351, region: 'Boucle du Mouhoun', province: 'Bale', commune: 'Boromo', village: 'Oury', debit_litre_heure: 1800, nombre_menages_desservis: 94, distance_avg_menages: 210, traitement_eau: true, statut: 'valide', createdBy: 'anim-oury', validatedBy: 'atc-boromo' },
  { key: 'point-manga-1', nom: 'Forage Nagreongo', type_point_eau: 'forage', etat: 'moyen', gps_latitude: 11.6612, gps_longitude: -1.0684, region: 'Centre-Sud', province: 'Zoundweogo', commune: 'Manga', village: 'Nagreongo', debit_litre_heure: 1200, nombre_menages_desservis: 81, distance_avg_menages: 380, traitement_eau: false, statut: 'valide', createdBy: 'anim-manga', validatedBy: 'atc-manga' },
  { key: 'point-manga-2', nom: 'Puits Nagreongo Est', type_point_eau: 'puits_traditionnel', etat: 'mauvais', gps_latitude: 11.6658, gps_longitude: -1.0617, region: 'Centre-Sud', province: 'Zoundweogo', commune: 'Manga', village: 'Nagreongo', debit_litre_heure: 300, nombre_menages_desservis: 24, distance_avg_menages: 520, traitement_eau: false, statut: 'en_attente', createdBy: 'anim-manga' },
  { key: 'point-po-1', nom: 'Robinet Tiebiele', type_point_eau: 'robinet_adduction', etat: 'bon', gps_latitude: 11.0981, gps_longitude: -1.1471, region: 'Centre-Sud', province: 'Nahouri', commune: 'Po', village: 'Tiebiele', debit_litre_heure: 2200, nombre_menages_desservis: 102, distance_avg_menages: 130, traitement_eau: true, statut: 'valide', createdBy: 'anim-po', validatedBy: 'admin-main' },
];

const infrastructuresSeed = [
  { key: 'infra-manga-csps', nom: 'CSPS de Nagreongo', type_infra: 'csps', etat: 'bon', gps_latitude: 11.6604, gps_longitude: -1.0661, region: 'Centre-Sud', province: 'Zoundweogo', commune: 'Manga', village: 'Nagreongo', a_latrine: true, a_point_eau: true, a_lave_mains: true, nombre_usagers: 540, statut: 'valide', createdBy: 'anim-manga', validatedBy: 'atc-manga' },
  { key: 'infra-po-marche', nom: 'Marche de Tiebiele', type_infra: 'marche', etat: 'moyen', gps_latitude: 11.1002, gps_longitude: -1.1438, region: 'Centre-Sud', province: 'Nahouri', commune: 'Po', village: 'Tiebiele', a_latrine: true, a_point_eau: false, a_lave_mains: false, nombre_usagers: 320, statut: 'en_attente', createdBy: 'anim-po' },
];

const ecolesSeed = [
  { key: 'ecole-manga-a', nom: 'Ecole Primaire Nagreongo A', type_ecole: 'primaire', statut_gestion: 'public', nombre_eleves: 312, nombre_eleves_filles: 154, nombre_enseignants: 8, nombre_classes: 6, gps_latitude: 11.6628, gps_longitude: -1.0666, region: 'Centre-Sud', province: 'Zoundweogo', commune: 'Manga', village: 'Nagreongo', latrine_existe: true, latrine_etat: 'bon', latrine_separee_genre: true, nombre_latrines_filles: 3, nombre_latrines_garcons: 3, latrine_accessible_handicap: false, point_eau_existe: true, type_point_eau: 'forage', eau_potable: true, eau_disponible_toute_annee: true, lave_mains_existe: true, lave_mains_fonctionnel: true, savon_disponible: true, club_hygiene_existe: true, programme_atpc: true, comite_eau_existe: true, activites_hygiene: true, gestion_dechets: true, distance_point_eau_m: 45, distance_latrine_plus_proche_m: 20, statut: 'valide', createdBy: 'anim-manga', validatedBy: 'atc-manga' },
  { key: 'ecole-manga-b', nom: 'CEG de Manga', type_ecole: 'secondaire', statut_gestion: 'public', nombre_eleves: 876, nombre_eleves_filles: 421, nombre_enseignants: 26, nombre_classes: 12, gps_latitude: 11.6587, gps_longitude: -1.0714, region: 'Centre-Sud', province: 'Zoundweogo', commune: 'Manga', village: 'Nagreongo', latrine_existe: true, latrine_etat: 'moyen', latrine_separee_genre: true, nombre_latrines_filles: 4, nombre_latrines_garcons: 4, latrine_accessible_handicap: true, point_eau_existe: false, eau_potable: false, eau_disponible_toute_annee: false, lave_mains_existe: false, lave_mains_fonctionnel: false, savon_disponible: false, club_hygiene_existe: true, programme_atpc: false, comite_eau_existe: false, activites_hygiene: true, gestion_dechets: true, distance_point_eau_m: 280, distance_latrine_plus_proche_m: 18, statut: 'en_attente', createdBy: 'anim-manga' },
  { key: 'ecole-po-a', nom: 'Ecole Primaire Tiebiele', type_ecole: 'primaire', statut_gestion: 'communautaire', nombre_eleves: 428, nombre_eleves_filles: 207, nombre_enseignants: 11, nombre_classes: 8, gps_latitude: 11.0979, gps_longitude: -1.1462, region: 'Centre-Sud', province: 'Nahouri', commune: 'Po', village: 'Tiebiele', latrine_existe: true, latrine_etat: 'bon', latrine_separee_genre: true, nombre_latrines_filles: 2, nombre_latrines_garcons: 2, latrine_accessible_handicap: false, point_eau_existe: true, type_point_eau: 'robinet', eau_potable: true, eau_disponible_toute_annee: true, lave_mains_existe: true, lave_mains_fonctionnel: true, savon_disponible: true, club_hygiene_existe: true, programme_atpc: true, comite_eau_existe: true, activites_hygiene: true, gestion_dechets: true, distance_point_eau_m: 25, distance_latrine_plus_proche_m: 15, statut: 'valide', createdBy: 'anim-po', validatedBy: 'admin-main' },
  { key: 'ecole-boromo-a', nom: 'Ecole Primaire Oury', type_ecole: 'primaire', statut_gestion: 'public', nombre_eleves: 265, nombre_eleves_filles: 131, nombre_enseignants: 7, nombre_classes: 5, gps_latitude: 11.7511, gps_longitude: -2.9345, region: 'Boucle du Mouhoun', province: 'Bale', commune: 'Boromo', village: 'Oury', latrine_existe: true, latrine_etat: 'bon', latrine_separee_genre: true, nombre_latrines_filles: 2, nombre_latrines_garcons: 2, latrine_accessible_handicap: false, point_eau_existe: true, type_point_eau: 'forage', eau_potable: true, eau_disponible_toute_annee: true, lave_mains_existe: true, lave_mains_fonctionnel: true, savon_disponible: false, club_hygiene_existe: true, programme_atpc: true, comite_eau_existe: true, activites_hygiene: true, gestion_dechets: true, distance_point_eau_m: 30, distance_latrine_plus_proche_m: 12, statut: 'valide', createdBy: 'anim-oury', validatedBy: 'atc-boromo' },
];

function syncIdFor(prefix, key) {
  return `${PRESENTATION_TAG}-${prefix}-${key}`;
}

async function upsertUser(definition, creatorId) {
  const passwordHash = await bcrypt.hash(definition.password, 12);
  const update = {
    nom: definition.nom,
    prenom: definition.prenom,
    email: definition.email.toLowerCase(),
    password_hash: passwordHash,
    role: definition.role,
    statut: definition.statut,
    region: definition.region,
    province: definition.province,
    commune: definition.commune,
    village: definition.village,
    telephone: definition.telephone,
    created_by: creatorId || undefined,
    last_login: new Date(),
  };

  return User.findOneAndUpdate(
    { email: definition.email.toLowerCase() },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedUsers() {
  const userMap = new Map();

  const adminSeed = usersSeed.find((item) => item.key === 'admin-main');
  const rootAdmin = await upsertUser(adminSeed, undefined);
  userMap.set(adminSeed.key, rootAdmin);

  for (const definition of usersSeed.filter((item) => item.key !== 'admin-main')) {
    const user = await upsertUser(definition, rootAdmin._id);
    userMap.set(definition.key, user);
  }

  return userMap;
}

async function upsertMenages(userMap) {
  const menageMap = new Map();
  for (const definition of householdsSeed) {
    const createdBy = userMap.get(definition.createdBy);
    const validatedBy = definition.validatedBy ? userMap.get(definition.validatedBy) : null;
    const payload = {
      nom_chef: definition.nom_chef,
      nombre_personnes: definition.nombre_personnes,
      gps_latitude: definition.gps_latitude,
      gps_longitude: definition.gps_longitude,
      region: definition.region,
      province: definition.province,
      commune: definition.commune,
      village: definition.village,
      quartier: definition.quartier,
      pratique_defecation: definition.pratique_defecation,
      eau_potable_acces: definition.eau_potable_acces,
      distance_point_eau_m: definition.distance_point_eau_m,
      lavage_mains_apres_wc: definition.lavage_mains_apres_wc,
      lavage_mains_savon: definition.lavage_mains_savon,
      lave_mains_existe: definition.lave_mains_existe,
      membre_atpc: definition.membre_atpc,
      village_odf: definition.village_odf,
      gestion_ordures: definition.gestion_ordures,
      statut: definition.statut,
      commentaire_rejet: definition.commentaire_rejet || null,
      collected_offline: false,
      sync_id: syncIdFor('menage', definition.key),
      created_by: createdBy._id,
      validated_by: validatedBy?._id,
      validated_at: validatedBy ? new Date() : undefined,
    };
    const menage = await Menage.findOneAndUpdate(
      { sync_id: payload.sync_id },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    menageMap.set(definition.key, menage);
  }
  return menageMap;
}

async function upsertLatrines(userMap, menageMap) {
  for (const definition of latrinesSeed) {
    const createdBy = userMap.get(definition.createdBy);
    const validatedBy = definition.validatedBy ? userMap.get(definition.validatedBy) : null;
    const menage = menageMap.get(definition.menageKey);
    await Latrine.findOneAndUpdate(
      { sync_id: syncIdFor('latrine', definition.key) },
      {
        menage_id: menage._id,
        existe: definition.existe,
        type_latrine: definition.type_latrine,
        etat: definition.etat,
        nombre_utilisateurs: definition.nombre_utilisateurs,
        distance_menage: definition.distance_menage,
        superstructure: definition.superstructure,
        dalle_integre: definition.dalle_integre,
        statut: definition.statut,
        commentaire_rejet: definition.commentaire_rejet || null,
        collected_offline: false,
        sync_id: syncIdFor('latrine', definition.key),
        created_by: createdBy._id,
        validated_by: validatedBy?._id,
        validated_at: validatedBy ? new Date() : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function upsertPointsEau(userMap) {
  for (const definition of pointsSeed) {
    const createdBy = userMap.get(definition.createdBy);
    const validatedBy = definition.validatedBy ? userMap.get(definition.validatedBy) : null;
    await PointEau.findOneAndUpdate(
      { sync_id: syncIdFor('point', definition.key) },
      {
        nom: definition.nom,
        type_point_eau: definition.type_point_eau,
        etat: definition.etat,
        gps_latitude: definition.gps_latitude,
        gps_longitude: definition.gps_longitude,
        region: definition.region,
        province: definition.province,
        commune: definition.commune,
        village: definition.village,
        debit_litre_heure: definition.debit_litre_heure,
        nombre_menages_desservis: definition.nombre_menages_desservis,
        distance_avg_menages: definition.distance_avg_menages,
        traitement_eau: definition.traitement_eau,
        statut: definition.statut,
        collected_offline: false,
        sync_id: syncIdFor('point', definition.key),
        created_by: createdBy._id,
        validated_by: validatedBy?._id,
        validated_at: validatedBy ? new Date() : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function upsertInfrastructures(userMap) {
  for (const definition of infrastructuresSeed) {
    const createdBy = userMap.get(definition.createdBy);
    const validatedBy = definition.validatedBy ? userMap.get(definition.validatedBy) : null;
    await Infrastructure.findOneAndUpdate(
      { sync_id: syncIdFor('infra', definition.key) },
      {
        nom: definition.nom,
        type_infra: definition.type_infra,
        etat: definition.etat,
        gps_latitude: definition.gps_latitude,
        gps_longitude: definition.gps_longitude,
        region: definition.region,
        province: definition.province,
        commune: definition.commune,
        village: definition.village,
        a_latrine: definition.a_latrine,
        a_point_eau: definition.a_point_eau,
        a_lave_mains: definition.a_lave_mains,
        nombre_usagers: definition.nombre_usagers,
        statut: definition.statut,
        collected_offline: false,
        sync_id: syncIdFor('infra', definition.key),
        created_by: createdBy._id,
        validated_by: validatedBy?._id,
        validated_at: validatedBy ? new Date() : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function upsertEcoles(userMap) {
  for (const definition of ecolesSeed) {
    const createdBy = userMap.get(definition.createdBy);
    const validatedBy = definition.validatedBy ? userMap.get(definition.validatedBy) : null;
    await Ecole.findOneAndUpdate(
      { sync_id: syncIdFor('ecole', definition.key) },
      {
        nom: definition.nom,
        type_ecole: definition.type_ecole,
        statut_gestion: definition.statut_gestion,
        nombre_eleves: definition.nombre_eleves,
        nombre_eleves_filles: definition.nombre_eleves_filles,
        nombre_enseignants: definition.nombre_enseignants,
        nombre_classes: definition.nombre_classes,
        gps_latitude: definition.gps_latitude,
        gps_longitude: definition.gps_longitude,
        region: definition.region,
        province: definition.province,
        commune: definition.commune,
        village: definition.village,
        latrine_existe: definition.latrine_existe,
        latrine_etat: definition.latrine_etat,
        latrine_separee_genre: definition.latrine_separee_genre,
        nombre_latrines_filles: definition.nombre_latrines_filles,
        nombre_latrines_garcons: definition.nombre_latrines_garcons,
        latrine_accessible_handicap: definition.latrine_accessible_handicap,
        point_eau_existe: definition.point_eau_existe,
        type_point_eau: definition.type_point_eau,
        eau_potable: definition.eau_potable,
        eau_disponible_toute_annee: definition.eau_disponible_toute_annee,
        lave_mains_existe: definition.lave_mains_existe,
        lave_mains_fonctionnel: definition.lave_mains_fonctionnel,
        savon_disponible: definition.savon_disponible,
        club_hygiene_existe: definition.club_hygiene_existe,
        programme_atpc: definition.programme_atpc,
        comite_eau_existe: definition.comite_eau_existe,
        activites_hygiene: definition.activites_hygiene,
        gestion_dechets: definition.gestion_dechets,
        distance_point_eau_m: definition.distance_point_eau_m,
        distance_latrine_plus_proche_m: definition.distance_latrine_plus_proche_m,
        statut: definition.statut,
        collected_offline: false,
        sync_id: syncIdFor('ecole', definition.key),
        created_by: createdBy._id,
        validated_by: validatedBy?._id,
        validated_at: validatedBy ? new Date() : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function seed() {
  await connectDB();

  const userMap = await seedUsers();
  const menageMap = await upsertMenages(userMap);
  await upsertLatrines(userMap, menageMap);
  await upsertPointsEau(userMap);
  await upsertInfrastructures(userMap);
  await upsertEcoles(userMap);

  console.log('✅ Comptes actifs prêts :');
  console.log(`   admin@wash-tracker.bf / ${PASSWORDS.admin}`);
  console.log(`   presentation.admin@wash-tracker.bf / ${PASSWORDS.admin}`);
  console.log(`   atc@wash-tracker.bf / ${PASSWORDS.atc}`);
  console.log(`   atc.manga@wash-tracker.bf / ${PASSWORDS.atc}`);
  console.log(`   animateur@wash-tracker.bf / ${PASSWORDS.animateur}`);
  console.log(`   animateur.manga@wash-tracker.bf / ${PASSWORDS.animateur}`);
  console.log(`   animateur.po@wash-tracker.bf / ${PASSWORDS.animateur}`);
  console.log('✅ Donnees de presentation WASH mises a jour');

  await mongoose.disconnect();
  console.log('🏁 Seed termine');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
