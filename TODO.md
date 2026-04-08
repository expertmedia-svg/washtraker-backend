# WASH Tracker — État du projet

## ✅ Backend (Node.js / Express / MongoDB Atlas)
- `cd backend && npm install` — dépendances OK
- `cp env.example .env` et renseigner MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
- `cd backend && node seed.js` — créer les utilisateurs de test
- `cd backend && node server.js` — démarrer l'API sur le port 3000
- Utilisateurs test: admin@wash-tracker.bf / WashAdmin2025! · atc@wash-tracker.bf / WashAtc2025!

## ✅ Frontend Web (HTML statique)
- `npx http-server -p 8081` depuis la racine du projet
- Dashboard admin : http://localhost:8081/wash_tracker_dashboard.html
- Dashboard ATC   : http://localhost:8081/atc_dashboard.html
- Login           : http://localhost:8081/login.html

## ✅ Application Mobile (Flutter)
- `cd "mobile app" && flutter pub get`
- `flutter run` — lancer sur émulateur Android (baseUrl = 10.0.2.2:3000)
- Pour production : mettre à jour `ApiConfig.baseUrl` dans `lib/auth_service.dart`

## ⚠️ Avant mise en production
- Changer `NODE_ENV=production` dans `.env`
- Générer de nouveaux secrets JWT : `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Mettre à jour `ALLOWED_ORIGINS` avec le domaine de production
- Mettre à jour `ApiConfig.baseUrl` dans le code Flutter avec l'URL du serveur
