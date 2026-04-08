const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  device_id:         { type: String, required: true },
  sync_status:       { type: String, enum: ['pending', 'success', 'failed', 'partial'], default: 'pending' },
  menages_synced:    { type: Number, default: 0 },
  latrines_synced:   { type: Number, default: 0 },
  points_eau_synced: { type: Number, default: 0 },
  infras_synced:     { type: Number, default: 0 },
  ecoles_synced:     { type: Number, default: 0 },
  errors_count:      { type: Number, default: 0 },
  error_details:     { type: mongoose.Schema.Types.Mixed },
  started_at:        { type: Date, default: Date.now },
  completed_at:      { type: Date },
  ip_address:        { type: String },
}, {
  timestamps: false,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; } },
});

syncLogSchema.index({ user_id: 1 });
syncLogSchema.index({ sync_status: 1 });
syncLogSchema.index({ device_id: 1 });

module.exports = mongoose.model('SyncLog', syncLogSchema);
