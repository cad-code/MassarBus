// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const TripLocation = require('./models/TripLocation');
const Bus = require('./models/Bus');
const jwt = require('jsonwebtoken');
const initCronJobs = require('./utils/cronJobs');

// 1. INITIALISATION
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // En production, on mettra l'URL de ton Dashboard React
    methods: ["GET", "POST"]
  }
});

 
app.use(cors());
app.use(express.json());

// 2.INJECTION DES ROUTES API REST
const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');
const studentRoutes = require('./routes/studentRoutes');
const tripRoutes = require('./routes/tripRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const tripLocationRoutes = require('./routes/tripLocationRoutes');
const parentRoutes = require('./routes/parentRoutes');
const tripController = require('./controllers/tripController');
const User = require('./models/User'); 
const Notification = require('./models/Notification');
const admin = require('./config/firebase');

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/triplocations', tripLocationRoutes);
app.use('/api/parents', parentRoutes);

// 3.CONNEXION À LA BASE DE DONNÉES

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🟢 Connecté avec succès à MongoDB !');
    
    initCronJobs();
  })
  .catch((err) => console.error('🔴 Erreur de connexion MongoDB :', err));

// 4.GESTION DES WEBSOCKETS SÉCURISÉS (ROOMS MULTIPLES)

// Middleware pour sécuriser Socket.io avec JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['x-auth-token'];

  if (!token) {
    return next(new Error('Authentification échouée. Aucun token fourni.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; 
    next();
  } catch (err) {
    return next(new Error('Token invalide ou expiré.'));
  }
});

// Écoute des événements
io.on('connection', (socket) => {
  console.log(`🟢 Appareil authentifié (Socket ID: ${socket.id} | User ID: ${socket.user.userId} | Rôle: ${socket.user.role})`);
  
  if (socket.user.role === 'ADMIN') {
    socket.join('admin_room');
    console.log(`👑 L'Admin a rejoint le salon global (admin_room)`);
  }

  socket.on('join_trip', (tripId) => {
    socket.join(`trip_${tripId}`);
    console.log(`👤 L'utilisateur a rejoint la room privée : trip_${tripId}`);
  });

  // Réception et traitement du flux GPS
  socket.on('update_location', async (data) => {
    try {
      const { tripId, busId, latitude, longitude, speed } = data;
      const secureDriverId = socket.user.userId;

      await Bus.findByIdAndUpdate(busId, {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude] 
        }
      });

      await TripLocation.create({
        tripId,
        busId,
        driverId: secureDriverId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        speed: speed || 0
      });

      io.to(`trip_${tripId}`).to('admin_room').emit('bus_moved', {
        tripId,
        busId,
        latitude,
        longitude,
        speed: speed || 0
      });

      //Lancement du radar de proximité en arrière-plan
      tripController.checkProximityAlerts(tripId, latitude, longitude);

    } catch (error) {
      console.error('🔴 Erreur lors du traitement GPS Socket :', error.message);
    }
  });

  // L'événement driver_alert doit être EN DEHORS de update_location
  socket.on('driver_alert', (data) => {
    console.log('🚨 URGENCE REÇUE DU CHAUFFEUR:', data);
    io.emit('admin_notification', data); 
  });


  socket.on('send_broadcast', async (data, callback) => { // ⚠️ Attention à bien ajouter 'async' ici
    console.log(`📢 Broadcast Reçu de l'Admin pour [${data.target}]: ${data.message}`);

    try {
      let filter = {};
      if (data.target === 'parents') filter.role = 'PARENT';
      else if (data.target === 'drivers' || data.target === 'chauffeurs') filter.role = 'DRIVER';

      //Récupérer les utilisateurs cibles
      const targetUsers = await User.find(filter);
      const notificationsToSave = [];
      const fcmTokens = [];

      //Préparer les données pour MongoDB et Firebase
      targetUsers.forEach(user => {
        // Préparation pour MongoDB
        const notifData = {
          type: 'BROADCAST',
          title: "📢 Message de l'Administration",
          message: data.message
        };

        // On assigne le bon ID selon le rôle
        if (user.role === 'PARENT') {
          notifData.parentId = user._id;
        } else if (user.role === 'DRIVER') {
          notifData.driverId = user._id;
        }

        notificationsToSave.push(notifData);

        // Préparation pour Firebase
        if (user.fcmToken) {
          fcmTokens.push(user.fcmToken);
        }
      });
      //Sauvegarder dans MongoDB pour l'historique des téléphones
      if (notificationsToSave.length > 0) {
        await Notification.insertMany(notificationsToSave);
        console.log(`💾 ${notificationsToSave.length} notifications sauvegardées en BDD.`);
      }

      //ENVOI DU PUSH FIREBASE MASSIF 
      if (fcmTokens.length > 0) {
        const messagePayload = {
          notification: {
            title: "📢 Alerte Administration",
            body: data.message,
          },
          tokens: fcmTokens, 
        };
        const response = await admin.messaging().sendEachForMulticast(messagePayload);
        console.log(`📲 Firebase Push envoyé. Succès: ${response.successCount}, Échecs: ${response.failureCount}`);
      }

      //Diffuser en temps réel via Socket.io si l'app est ouverte
      socket.broadcast.emit('receive_broadcast_alert', data);

      //Confirmer au front-end React 
      if (typeof callback === 'function') {
        callback({ 
          success: true, 
          recipients: targetUsers.length 
        });
      }
    } catch (err) {
      console.error(" Erreur critique lors du Broadcast :", err);
      if (typeof callback === 'function') {
        callback({ 
          success: false, 
          error: "Erreur interne du serveur lors de la diffusion." 
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(` Appareil déconnecté (Socket ID: ${socket.id})`);
  });
});



//LANCEMENT DU SERVEUR

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Serveur démarré sur le port ${PORT}`);
  console.log(` Socket.io est sécurisé et prêt`);
  console.log(`=========================================`);
});