// backend/models/Bus.js
const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['MAINTENANCE', 'AVAILABLE', 'ON_ROUTE'],
    default: 'AVAILABLE'
  },
  currentTripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    default: null
  },

  // Position actuelle du bus au format GeoJSON, utilisée pour les recherches géospatiales.
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, {
  timestamps: true
});

// Index géospatial 2dsphere nécessaire aux requêtes de proximité (Geofencing).
busSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Bus', busSchema);