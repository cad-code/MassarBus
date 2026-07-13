// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Les champs sont optionnels afin de supporter les notifications globales (broadcast)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },

  // Permet de conserver l'historique des notifications des chauffeurs
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: false },

  type: {
    type: String,
    enum: ['APPROACHING', 'BOARDED', 'DROPPED', 'DELAY', 'EMERGENCY', 'INFO', 'BROADCAST'],
    required: true
  },
  title: { type: String, required: true },

  // Correspond au champ utilisé par l'application Flutter
  message: { type: String, required: true },

  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);