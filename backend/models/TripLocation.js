// backend/models/TripLocation.js
const mongoose = require('mongoose');

const tripLocationSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },

  // Dénormalisation pour faciliter les analyses et les requêtes
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  speed: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

tripLocationSchema.index({ location: '2dsphere' });

// Optimise les requêtes de l'historique d'un trajet
tripLocationSchema.index({ tripId: 1, timestamp: -1 });

module.exports = mongoose.model('TripLocation', tripLocationSchema);