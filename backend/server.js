const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const TripLocation = require('./models/TripLocation');
const Bus = require('./models/Bus');
const jwt = require('jsonwebtoken');
const initCronJobs = require('./utils/cronJobs');

// 1. INITIALISATION EXPRESS (Sans HTTP / Socket.io)
const app = express();

app.use(cors());
app.use(express.json());

// 2. INJECTION DES ROUTES API REST
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

// 3. CONNEXION À LA BASE DE DONNÉES
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🟢 Connecté avec succès à MongoDB (Vercel Serverless) !');
    initCronJobs();
  })
  .catch((err) => console.error('🔴 Erreur de connexion MongoDB :', err));

// 4. EXPORTATION POUR VERCEL
// On ne fait plus de server.listen(), Vercel s'en occupe automatiquement !
module.exports = app;