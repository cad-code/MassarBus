const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: false
    }
  }
});

const routeSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: true,
    trim: true
  },
  stops: [stopSchema],

  // Assignations par défaut utilisées par l'automatisation CRON
  defaultDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  defaultBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Route', routeSchema);