const mongoose = require('mongoose');

const infrastructureSchema = new mongoose.Schema({
  nom:              { type: String, required: true, maxlength: 200 },
  type_infra:       { type: String, enum: ['ecole_primaire', 'ecole_secondaire', 'dispensaire', 'csps', 'marche', 'mosquee', 'eglise', 'autre'], required: true },
  etat:             { type: String, enum: ['bon', 'moyen', 'mauvais', 'hors_service'], required: true },
  gps_latitude:     { type: Number, required: true },
  gps_longitude:    { type: Number, required: true },
  region:           { type: String, required: true, maxlength: 100 },
  province:         { type: String, maxlength: 100 },
  commune:          { type: String, required: true, maxlength: 100 },
  village:          { type: String, maxlength: 100 },
  a_latrine:        { type: Boolean, default: false },
  a_point_eau:      { type: Boolean, default: false },
  a_lave_mains:     { type: Boolean, default: false },
  nombre_usagers:   { type: Number },
  photo_url:        { type: String },
  notes:            { type: String },
  statut:           { type: String, enum: ['brouillon', 'en_attente', 'valide', 'rejete'], default: 'en_attente' },
  commentaire_rejet:{ type: String },
  collected_offline:{ type: Boolean, default: false },
  sync_id:          { type: String, unique: true, sparse: true },
  created_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validated_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validated_at:     { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; } },
});

infrastructureSchema.index({ commune: 1 });
infrastructureSchema.index({ type_infra: 1 });

module.exports = mongoose.model('Infrastructure', infrastructureSchema);
