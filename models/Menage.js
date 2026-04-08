const mongoose = require('mongoose');

// Modèle Ménage — Standard SNV / ATPC (Assainissement Total Piloté par la Communauté)
// Conforme aux indicateurs OMS/UNICEF JMP pour le Burkina Faso
const menageSchema = new mongoose.Schema({
  nom_chef:          { type: String, required: true, maxlength: 200 },
  nombre_personnes:  { type: Number, required: true, min: 1 },
  gps_latitude:      { type: Number },
  gps_longitude:     { type: Number },
  gps_accuracy:      { type: Number },
  region:            { type: String, required: true, maxlength: 100 },
  province:          { type: String, maxlength: 100 },
  commune:           { type: String, required: true, maxlength: 100 },
  village:           { type: String, maxlength: 100 },
  quartier:          { type: String, maxlength: 100 },

  // ── Indicateurs ATPC / SNV ──────────────────────────────────────────────
  // Pratiques de défécation (avant/après campagne ATPC)
  pratique_defecation:      { type: String, enum: ['air_libre', 'fosse_ouverte', 'latrine_couverte', 'latrine_amelioree', 'wc_chasse'], default: 'air_libre' },
  // Accès à l'eau potable
  eau_potable_acces:        { type: Boolean, default: false },
  distance_point_eau_m:     { type: Number },  // distance calculée au point d'eau le plus proche
  // Hygiène des mains
  lavage_mains_apres_wc:    { type: Boolean, default: false },
  lavage_mains_savon:       { type: Boolean, default: false },
  lave_mains_existe:        { type: Boolean, default: false },
  // ATPC
  membre_atpc:              { type: Boolean, default: false },  // membre d'un comité ATPC
  village_odf:              { type: Boolean, default: false },  // village déclaré FDAL (Fin Défécation A l'air Libre)
  // Gestion des ordures
  gestion_ordures:          { type: String, enum: ['brule', 'fosse', 'depot_ordures', 'non_geree'], default: 'non_geree' },

  statut:            { type: String, enum: ['brouillon', 'en_attente', 'valide', 'rejete'], default: 'en_attente' },
  commentaire_rejet: { type: String },
  collected_offline: { type: Boolean, default: false },
  sync_id:           { type: String, unique: true, sparse: true },
  created_by:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validated_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validated_at:      { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; } },
});

menageSchema.index({ commune: 1 });
menageSchema.index({ region: 1 });
menageSchema.index({ statut: 1 });
menageSchema.index({ created_by: 1 });
menageSchema.index({ gps_latitude: 1, gps_longitude: 1 });

module.exports = mongoose.model('Menage', menageSchema);
