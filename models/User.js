const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nom:           { type: String, required: true, maxlength: 100 },
  prenom:        { type: String, required: true, maxlength: 100 },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  telephone:     { type: String, maxlength: 20 },
  role:          { type: String, enum: ['admin', 'atc', 'animateur'], default: 'animateur', required: true },
  statut:        { type: String, enum: ['actif', 'inactif', 'suspendu'], default: 'actif', required: true },
  region:        { type: String, maxlength: 100 },
  province:      { type: String, maxlength: 100 },
  commune:       { type: String, maxlength: 100 },
  village:       { type: String, maxlength: 100 },
  device_id:     { type: String },
  fcm_token:     { type: String },
  last_login:    { type: Date },
  created_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret.__v; delete ret.password_hash; return ret; } },
  toObject: { virtuals: true },
});

userSchema.index({ role: 1 });
userSchema.index({ commune: 1 });
userSchema.index({ region: 1 });

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('User', userSchema);
