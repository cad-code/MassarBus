// backend/config/firebase.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require('./firebase-service-account.json');

// 1. Initialisation avec la nouvelle syntaxe modulaire (v12+)
const app = initializeApp({
  credential: cert(serviceAccount)
});

// 2. On recrée l'objet "admin" pour qu'il soit 100% compatible avec ton tripController
const admin = {
  messaging: () => getMessaging(app)
};

module.exports = admin;