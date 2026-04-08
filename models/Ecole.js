const mongoose = require('mongoose');

// Modèle École — Standard SNV/WASH in Schools (WinS)
// Conforme aux indicateurs OMS/UNICEF JMP et SNV Burkina Faso
const ecoleSchema = new mongoose.Schema({
  nom:                       { type: String, required: true, maxlength: 200 },
  type_ecole:                { type: String, enum: ['primaire', 'secondaire', 'ceb', 'jardin_enfants', 'autre'], required: true },
  statut_gestion:            { type: String, enum: ['public', 'prive', 'franco_arabe', 'coranique', 'communautaire'], default: 'public' },
  nombre_eleves:             { type: Number, min: 0, default: 0 },
  nombre_eleves_filles:      { type: Number, min: 0, default: 0 },
  nombre_enseignants:        { type: Number, min: 0, default: 0 },
  nombre_classes:            { type: Number, min: 0, default: 0 },

  // GPS
  gps_latitude:              { type: Number, required: true },
  gps_longitude:             { type: Number, required: true },
  gps_accuracy:              { type: Number },

  // Localisation administrative
  region:                    { type: String, required: true, maxlength: 100 },
  province:                  { type: String, maxlength: 100 },
  commune:                   { type: String, required: true, maxlength: 100 },
  village:                   { type: String, maxlength: 100 },

  // WASH — Latrines (indicateurs WinS JMP)
  latrine_existe:            { type: Boolean, default: false },
  latrine_etat:              { type: String, enum: ['bon', 'moyen', 'mauvais', 'hors_service'] },
  latrine_separee_genre:     { type: Boolean, default: false },
  nombre_latrines_filles:    { type: Number, min: 0, default: 0 },
  nombre_latrines_garcons:   { type: Number, min: 0, default: 0 },
  latrine_accessible_handicap: { type: Boolean, default: false },
  ratio_eleves_par_latrine:  { type: Number },  // calculé à la volée

  // WASH — Eau
  point_eau_existe:          { type: Boolean, default: false },
  type_point_eau:            { type: String, enum: ['robinet', 'forage', 'puits', 'citerne', 'autre'] },
  eau_potable:               { type: Boolean, default: false },
  eau_disponible_toute_annee: { type: Boolean, default: false },

  // WASH — Hygiène
  lave_mains_existe:         { type: Boolean, default: false },
  lave_mains_fonctionnel:    { type: Boolean, default: false },
  savon_disponible:          { type: Boolean, default: false },

  // ATPC / Environnement scolaire
  club_hygiene_existe:       { type: Boolean, default: false },
  programme_atpc:            { type: Boolean, default: false },
  comite_eau_existe:         { type: Boolean, default: false },
  activites_hygiene:         { type: Boolean, default: false },
  gestion_dechets:           { type: Boolean, default: false },

  // Distances calculées (depuis API proximité)
  distance_point_eau_m:      { type: Number },
  distance_latrine_plus_proche_m: { type: Number },

  photo_url:                 { type: String },
  notes:                     { type: String },

  // Workflow validation
  statut:                    { type: String, enum: ['brouillon', 'en_attente', 'valide', 'rejete'], default: 'en_attente' },
  commentaire_rejet:         { type: String },
  collected_offline:         { type: Boolean, default: false },
  sync_id:                   { type: String, unique: true, sparse: true },
  created_by:                { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validated_by:              { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validated_at:              { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; },
  },
});

// Calcul automatique du ratio élèves/latrines avant sauvegarde
ecoleSchema.pre('save', function (next) {
  const totalLatrines = (this.nombre_latrines_filles || 0) + (this.nombre_latrines_garcons || 0);
  if (totalLatrines > 0 && this.nombre_eleves > 0) {
    this.ratio_eleves_par_latrine = Math.round(this.nombre_eleves / totalLatrines);
  }
  next();
});

ecoleSchema.index({ commune: 1 });
ecoleSchema.index({ type_ecole: 1 });
ecoleSchema.index({ statut: 1 });
ecoleSchema.index({ gps_latitude: 1, gps_longitude: 1 });

module.exports = mongoose.model('Ecole', ecoleSchema);
