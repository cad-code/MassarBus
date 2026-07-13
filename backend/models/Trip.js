// backend/models/Trip.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  status: { type: String, enum: ['BOARDED', 'DROPPED', 'ABSENT'] },
  timestamp: { type: Date, default: Date.now },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    // Coordonnées GPS du pointage de l'élève.
    coordinates: { type: [Number] }
  }
});

const tripSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'EMERGENCY'],
    default: 'PENDING'
  },
  attendanceLogs: [attendanceSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Trip', tripSchema);