require('dotenv').config();
const { connectDB, mongoose } = require('./database');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function seed() {
  await connectDB();

  // Admin par défaut
  const existing = await User.findOne({ email: 'admin@wash-tracker.bf' });
  if (!existing) {
    const hash = await bcrypt.hash('WashAdmin2025!', 12);
    await User.create({
      nom: 'SNV',
      prenom: 'Administrateur',
      email: 'admin@wash-tracker.bf',
      password_hash: hash,
      role: 'admin',
      statut: 'actif',
      region: 'Centre',
      commune: 'Ouagadougou',
    });
    console.log('✅ Admin créé: admin@wash-tracker.bf / WashAdmin2025!');
  } else {
    console.log('ℹ️  Admin existe déjà');
  }

  // ATC de test
  const existingAtc = await User.findOne({ email: 'atc@wash-tracker.bf' });
  if (!existingAtc) {
    const hash = await bcrypt.hash('WashAtc2025!', 12);
    await User.create({
      nom: 'Ouédraogo',
      prenom: 'Ibrahim',
      email: 'atc@wash-tracker.bf',
      password_hash: hash,
      role: 'atc',
      statut: 'actif',
      region: 'Boucle du Mouhoun',
      province: 'Balé',
      commune: 'Boromo',
    });
    console.log('✅ ATC créé: atc@wash-tracker.bf / WashAtc2025!');
  }

  // Animateur de test
  const existingAnim = await User.findOne({ email: 'animateur@wash-tracker.bf' });
  if (!existingAnim) {
    const hash = await bcrypt.hash('WashAnim2025!', 12);
    await User.create({
      nom: 'Compaoré',
      prenom: 'Fatimata',
      email: 'animateur@wash-tracker.bf',
      password_hash: hash,
      role: 'animateur',
      statut: 'actif',
      region: 'Boucle du Mouhoun',
      province: 'Balé',
      commune: 'Boromo',
      village: 'Oury',
    });
    console.log('✅ Animateur créé: animateur@wash-tracker.bf / WashAnim2025!');
  }

  await mongoose.disconnect();
  console.log('🏁 Seed terminé');
}

seed().catch(err => { console.error(err); process.exit(1); });
