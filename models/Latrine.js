const mongoose = require('mongoose');

const latrineSchema = new mongoose.Schema({
  menage_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Menage', required: true },
  existe:             { type: Boolean, default: false },
  type_latrine:       { type: String, enum: ['fosse_simple', 'fosse_amelioree', 'dalle_sif', 'chasse_manuelle', 'wc_a_chasse', 'autre'] },
  etat:               { type: String, enum: ['bon', 'moyen', 'mauvais', 'hors_service'] },
  nombre_utilisateurs:{ type: Number },
  distance_menage:    { type: Number },
  superstructure:     { type: Boolean, default: false },
  dalle_integre:      { type: Boolean, default: false },
  photo_url:          { type: String },
  notes:              { type: String },
  statut:             { type: String, enum: ['brouillon', 'en_attente', 'valide', 'rejete'], default: 'en_attente' },
  commentaire_rejet:  { type: String },
  collected_offline:  { type: Boolean, default: false },
  sync_id:            { type: String, unique: true, sparse: true },
  created_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validated_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validated_at:       { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; } },
});

latrineSchema.index({ menage_id: 1 });
latrineSchema.index({ etat: 1 });
latrineSchema.index({ statut: 1 });

module.exports = mongoose.model('Latrine', latrineSchema);
