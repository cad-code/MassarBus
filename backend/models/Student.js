// backend/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: [true, 'Le prénom est obligatoire'] 
  },
  lastName: { 
    type: String, 
    required: [true, 'Le nom est obligatoire'] 
  },
  emergencyContact: { 
    type: String, 
    required: [true, 'Le contact d\'urgence est obligatoire'] 
  },
  routeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Route', 
    required: [true, 'La ligne de transport est obligatoire'] 
  },
  pickupStopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: [true, 'L\'arrêt de montée est obligatoire'] 
  },
  dropoffStopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: false 
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false 
  },
  isAbsentToday: { 
    type: Boolean, 
    default: false 
  },
  status: {
    type: String,
    enum: ['PENDING', 'WAITING', 'BOARDED', 'ON_BUS', 'DROPPED', 'DROPPED_OFF', 'ABSENT'],
    default: 'PENDING'
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Student', studentSchema);