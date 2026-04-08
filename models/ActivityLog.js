const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:      { type: String, required: true, maxlength: 100 },
  entity_type: { type: String, maxlength: 50 },
  entity_id:   { type: mongoose.Schema.Types.ObjectId },
  details:     { type: mongoose.Schema.Types.Mixed },
  ip_address:  { type: String },
  created_at:  { type: Date, default: Date.now },
}, {
  timestamps: false,
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; return ret; } },
});

activityLogSchema.index({ user_id: 1 });
activityLogSchema.index({ entity_type: 1, entity_id: 1 });
activityLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
