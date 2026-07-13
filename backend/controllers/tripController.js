// backend/controllers/tripController.js
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const User = require('../models/User');
const admin = require('../config/firebase');
const { calculateDistanceInMeters } = require('../utils/geoUtils');

// Cache en mémoire pour éviter le spam des notifications de proximité
const alertedStudentsCache = new Set();

exports.createTrip = async (req, res) => {
  try {
    const { routeId, driverId, busId } = req.body;
    
    const newTrip = await Trip.create({
      routeId,
      driverId,
      busId,
      startTime: Date.now(),
      status: 'PENDING'
    });

    res.status(201).json({ message: "Trajet assigné avec succès", trip: newTrip });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du trajet", error: error.message });
  }
};

exports.getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ 
      driverId: req.user._id,
      status: { $in: ['PENDING', 'PLANNED', 'IN_PROGRESS', 'EMERGENCY'] } 
    })
    .populate('routeId')
    .populate('busId')
    .lean();

    const tripsWithStudents = await Promise.all(trips.map(async (trip) => {
      const routeIdToSearch = trip.routeId ? (trip.routeId._id || trip.routeId) : null;
      const studentsForThisRoute = await Student.find({ routeId: routeIdToSearch }).select('_id'); 

      return {
        ...trip,
        students: studentsForThisRoute
      };
    }));
    
    return res.status(200).json(tripsWithStudents);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des trajets" });
  }
};

exports.startTrip = async (req, res) => {
  try {
    const { routeId, busId } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus || bus.status !== 'AVAILABLE') {
      return res.status(400).json({ message: "Ce bus n'est pas disponible actuellement." });
    }

    const newTrip = await Trip.create({
      routeId,
      driverId: req.user._id,
      busId,
      startTime: Date.now(),
      status: 'IN_PROGRESS'
    });

    bus.status = 'ON_ROUTE';
    bus.currentTripId = newTrip._id;
    await bus.save();

    const expectedStudents = await Student.find({ routeId: routeId });

    if (expectedStudents.length > 0) {
      const notifications = [];
      const parentIdsToNotify = new Set(); 

      expectedStudents.forEach(student => {
        if (student.parentId) {
          notifications.push({
            parentId: student.parentId,
            studentId: student._id,
            type: 'INFO',
            title: "🚌 Le bus est en route !",
            message: "Le trajet de votre enfant vient de démarrer."
          });
          parentIdsToNotify.add(student.parentId.toString());
        }
      });
        
      if (notifications.length > 0) {
        await Notification.insertMany(notifications); 

        try {
          const parents = await User.find({ _id: { $in: Array.from(parentIdsToNotify) } });
          
          const sendPromises = parents.map(async (parent) => {
            if (parent.fcmToken) {
              try {
                await admin.messaging().send({
                  notification: { 
                    title: "🚌 Le bus est en route !", 
                    body: "Le trajet de votre enfant vient de démarrer." 
                  },
                  token: parent.fcmToken
                });
                console.log(`📲 Push "Démarrage" envoyé avec succès à : ${parent.name || parent.email}`);
              } catch (fcmErr) {
                console.error(`🔴 Erreur FCM pour ${parent.email} :`, fcmErr.message);
              }
            }
          });

          await Promise.all(sendPromises);
        } catch (dbErr) {
          console.error("🔴 Erreur lors de la récupération des parents pour le FCM :", dbErr.message);
        }
      }
    }

    res.status(201).json({ message: "Trajet démarré avec succès.", trip: newTrip });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du démarrage", error: error.message });
  }
};

exports.logAttendance = async (req, res) => {
  try {
    const { studentId, status, longitude, latitude } = req.body;
    const tripId = req.params.id;

    const trip = await Trip.findById(tripId);
    if(!trip || (trip.status !== 'IN_PROGRESS' && trip.status !== 'PLANNED' && trip.status !== 'PENDING' && trip.status !== 'EMERGENCY')) {
      return res.status(400).json({ message: "Trajet introuvable ou non actif." });
    }

    if (trip.status === 'PENDING' || trip.status === 'PLANNED') {
      trip.status = 'IN_PROGRESS';
      trip.startTime = Date.now();
    }

    trip.attendanceLogs.push({
      studentId,
      status,
      timestamp: Date.now(), 
      location: {
        type: 'Point',
        coordinates: [longitude || 0, latitude || 0] 
      }
    });

    await trip.save();

    try {
      const student = await Student.findById(studentId);
      
      if (student) {
        student.status = status;
        await student.save();

        if (student.parentId) {
          let notifTitle = "";
          let notifMessage = "";

          if (status === 'BOARDED') {
            notifTitle = "Enfant monté à bord";
            notifMessage = `${student.firstName} est bien monté dans le bus.`;
          } else if (status === 'DROPPED') {
            notifTitle = "Enfant arrivé";
            notifMessage = `${student.firstName} est bien descendu du bus.`;
          }

          if (notifTitle) {
            await Notification.create({
              parentId: student.parentId,
              studentId: student._id,
              type: status,
              title: notifTitle,
              message: notifMessage
            });
            
            const parent = await User.findById(student.parentId);
            if (parent && parent.fcmToken) {
              await admin.messaging().send({
                notification: { title: notifTitle, body: notifMessage },
                token: parent.fcmToken
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.log(`🔴 Erreur lors de la génération de la notification : ${notifErr.message}`);
    }

    res.status(200).json({ message: `Pointage enregistré : ${status}`, trip });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du pointage.", error: error.message });
  }
};

exports.endTrip = async (req, res) => {
  try {
    const tripId = req.params.id;
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trajet introuvable." });

    trip.status = 'COMPLETED';
    trip.endTime = Date.now();
    await trip.save();

    const bus = await Bus.findById(trip.busId);
    if (bus) {
      bus.status = 'AVAILABLE';
      bus.currentTripId = null;
      await bus.save();
    }

    // Nettoyage de la RAM pour éviter les fuites de mémoire (Memory Leak)
    for (const key of alertedStudentsCache) {
      if (key.startsWith(tripId.toString())) {
        alertedStudentsCache.delete(key);
      }
    }

    res.status(200).json({ message: "Trajet terminé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la clôture.", error: error.message });
  }
};

exports.getTripManifest = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate('routeId');
    if (!trip) {
      return res.status(404).json({ message: "Trajet introuvable." });
    }

    const attendanceMap = {};
    if (trip.attendanceLogs && trip.attendanceLogs.length > 0) {
      trip.attendanceLogs.forEach(log => {
        attendanceMap[log.studentId.toString()] = log.status;
      });
    }

    const routeIdToSearch = trip.routeId ? (trip.routeId._id || trip.routeId) : null;
    const expectedStudents = await Student.find({ routeId: routeIdToSearch }).populate('routeId'); 

    const manifestByStop = {};
    
    expectedStudents.forEach(student => {
      let stopName = "Arrêt introuvable"; 

      if (student.routeId && student.routeId.stops && Array.isArray(student.routeId.stops)) {
         const stop = student.routeId.stops.find(s => s._id.toString() === student.pickupStopId.toString());
         if (stop) {
             stopName = stop.name || stop.stopName || stop.nom || "Arrêt sans nom";
         }
      }

      if (!manifestByStop[stopName]) {
        manifestByStop[stopName] = [];
      }
      
      manifestByStop[stopName].push({
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        emergencyContact: student.emergencyContact,
        status: attendanceMap[student._id.toString()] || "PENDING",
        isAbsentToday: student.isAbsentToday
      });
    });

    res.status(200).json({
      tripId: trip._id,
      routeName: trip.routeId ? (trip.routeId.name || trip.routeId.routeName) : "Inconnu",
      totalExpected: expectedStudents.length,
      manifest: manifestByStop
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la génération de la liste.", error: error.message });
  }
};

exports.reportIssue = async (req, res) => {
  try {
    const { issueMessage, issueType = 'DELAY' } = req.body; 
    const tripId = req.params.id;

    const trip = await Trip.findById(tripId).populate('routeId');
    if (!trip) return res.status(404).json({ message: "Trajet introuvable." });

    trip.status = issueType === 'DELAY' ? 'IN_PROGRESS' : 'EMERGENCY';
    await trip.save();

    const routeIdToSearch = trip.routeId ? (trip.routeId._id || trip.routeId) : null;
    const expectedStudents = await Student.find({ routeId: routeIdToSearch });

    const notifications = expectedStudents
      .filter(student => student.parentId)
      .map(student => ({
        parentId: student.parentId,
        studentId: student._id,
        type: issueType === 'DELAY' ? 'DELAY' : 'EMERGENCY',
        title: issueType === 'DELAY' ? "Alerte Retard ⏱️" : "Alerte Incident ⚠️",
        message: issueMessage || "Un incident a été signalé sur le trajet."
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`🚨 Alerte de type ${issueType} diffusée à ${notifications.length} parent(s).`);
    }

    res.status(200).json({ message: "Alerte envoyée à l'administration et aux parents." });
  } catch (error) {
    res.status(500).json({ message: "Erreur.", error: error.message });
  }
};

exports.getActiveTripForRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    const activeTrip = await Trip.findOne({
      routeId: routeId,
      status: { $in: ['IN_PROGRESS', 'EMERGENCY'] }
    })
    .sort({ startTime: -1 })
    .select('_id status busId'); 

    if (!activeTrip) {
      return res.status(404).json({ message: "Aucun trajet actif pour le moment." });
    }

    res.status(200).json({ tripId: activeTrip._id, status: activeTrip.status });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};


//RADAR DE PROXIMITÉ (BUS EN APPROCHE)

exports.checkProximityAlerts = async (tripId, busLat, busLon) => {
  try {
    const trip = await Trip.findById(tripId).populate({
      path: 'routeId',
      populate: { path: 'stops' }
    });

    if (!trip || trip.status !== 'IN_PROGRESS') return;

    const expectedStudents = await Student.find({ 
      routeId: trip.routeId._id,
      isAbsentToday: false
    });

    for (const student of expectedStudents) {
      if (!student.parentId) continue;

      const stop = trip.routeId.stops.find(s => s._id.toString() === student.pickupStopId.toString());
      
      if (!stop || !stop.location || !stop.location.coordinates || stop.location.coordinates.length < 2) continue;

      const stopLon = stop.location.coordinates[0];
      const stopLat = stop.location.coordinates[1];

      const distance = calculateDistanceInMeters(busLat, busLon, stopLat, stopLon);

      if (distance <= 500) {
        
        const alertKey = `${trip._id}_${student._id}`;

        if (!alertedStudentsCache.has(alertKey)) {
          
          alertedStudentsCache.add(alertKey);

          const alreadyNotified = await Notification.findOne({
            tripId: trip._id,
            studentId: student._id,
            type: 'APPROACHING'
          });

          if (!alreadyNotified) {
            const title = "Le bus est en approche 🚌!";
            const bodyMessage = `${student.firstName} doit se préparer. Le bus arrive à l'arrêt ${stop.name}.`;

            await Notification.create({
              parentId: student.parentId,
              studentId: student._id,
              tripId: trip._id, 
              type: 'APPROACHING',
              title: title,
              message: bodyMessage
            });
            console.log(`📍 Alerte "En approche" sauvegardée en BDD pour ${student.firstName} (Distance : ${Math.round(distance)}m)`);

            try {
              const parent = await User.findById(student.parentId);
              
              if (parent && parent.fcmToken) {
                const fcmMessage = {
                  notification: {
                    title: title,
                    body: bodyMessage
                  },
                  token: parent.fcmToken
                };
                
                await admin.messaging().send(fcmMessage);
                console.log(`📲 Notification PUSH envoyée au téléphone de ${parent.name} !`);
              } else {
                console.log(`⚠️ Impossible d'envoyer le Push : Aucun Token FCM pour ${parent ? parent.name : 'Parent Inconnu'}`);
              }
            } catch (fcmError) {
              console.error("🔴 Erreur lors de l'envoi vers Firebase :", fcmError.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("🔴 Erreur Radar de proximité :", error.message);
  }
};

// @desc    Récupérer l'historique des trajets pour un étudiant spécifique
// @route   GET /api/trips/history/:studentId
// @access  Privé (Parent)
exports.getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const trips = await Trip.find({ 
      'attendanceLogs.studentId': studentId
    })
    .populate('routeId')
    .sort({ startTime: -1 })
    .limit(10); 

    let history = [];

    trips.forEach(trip => {
      const routeName = trip.routeId ? (trip.routeId.name || trip.routeId.routeName) : 'Trajet scolaire';

      const studentLogs = trip.attendanceLogs.filter(l => l.studentId.toString() === studentId);
      
      studentLogs.forEach(log => {
        history.push({
          _id: log._id,
          tripId: trip._id,
          date: log.timestamp || trip.updatedAt || trip.startTime, 
          routeName: routeName,
          status: log.status,
        });
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique.", error: error.message });
  }
};


//SUPPRESSION D'UN ÉLÉMENT DE L'HISTORIQUE

exports.deleteHistoryItem = async (req, res) => {
  try {
    const { historyId } = req.params;

    const trip = await Trip.findOneAndUpdate(
      { 'attendanceLogs._id': historyId }, 
      { $pull: { attendanceLogs: { _id: historyId } } }, 
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ message: "Enregistrement introuvable." });
    }

    res.status(200).json({ message: "Enregistrement supprimé avec succès." });
  } catch (error) {
    console.error("🔴 Erreur lors de la suppression de l'historique :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression.", error: error.message });
  }
};