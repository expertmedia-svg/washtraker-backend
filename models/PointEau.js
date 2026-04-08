const mongoose = require('mongoose');

const pointEauSchema = new mongoose.Schema({
  nom:                    { type: String, maxlength: 200 },
  type_point_eau:         { type: String, enum: ['forage', 'puits_moderne', 'puits_traditionnel', 'robinet_adduction', 'source', 'barrage', 'retenue_eau', 'autre'], required: true },
  etat:                   { type: String, enum: ['bon', 'moyen', 'mauvais', 'hors_service'], required: true },
  gps_latitude:           { type: Number, required: true },
  gps_longitude:          { type: Number, required: true },
  gps_accuracy:           { type: Number },
  region:                 { type: String, required: true, maxlength: 100 },
  province:               { type: String, maxlength: 100 },
  commune:                { type: String, required: true, maxlength: 100 },
  village:                { type: String, maxlength: 100 },
  annee_construction:     { type: Number },
  profondeur_metres:      { type: Number },
  debit_litre_heure:      { type: Number },
  traitement_eau:         { type: Boolean, default: false },
  nombre_menages_desservis: { type: Number },
  distance_avg_menages:   { type: Number },
  photo_url:              { type: String },
  notes:                  { type: String },
  statut:                 { type: String, enum: ['brouillon', 'en_attente', 'valide', 'rejete'], default: 'en_attente' },
  commentaire_rejet:      { type: String },
  collected_offline:      { type: Boolean, default: false },
  sync_id:                { type: String, unique: true, sparse: true },
  created_by:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validated_by:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validated_at:           { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; } },
});

pointEauSchema.index({ commune: 1 });
pointEauSchema.index({ type_point_eau: 1 });
pointEauSchema.index({ etat: 1 });
pointEauSchema.index({ gps_latitude: 1, gps_longitude: 1 });

module.exports = mongoose.model('PointEau', pointEauSchema);
