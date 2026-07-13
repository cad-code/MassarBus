// backend/routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Protection globale
router.use(protect);

// NOUVELLE ROUTE ICI : Récupérer les trajets assignés au chauffeur
router.get('/', authorize('DRIVER'), tripController.getMyTrips);
router.post('/', tripController.createTrip);

// Actions exclusives au Chauffeur
router.post('/start', authorize('DRIVER'), tripController.startTrip);
router.post('/:id/attendance', authorize('DRIVER'), tripController.logAttendance);
router.get('/:id/manifest', authorize('DRIVER'), tripController.getTripManifest);
router.put('/:id/end', authorize('DRIVER'), tripController.endTrip);

// La route pour signaler un problème
router.post('/:id/issue', tripController.reportIssue);

// Routes pour les Parents
router.get('/active/:routeId', protect, authorize('PARENT'), tripController.getActiveTripForRoute);
router.get('/history/:studentId', protect, tripController.getStudentHistory);

//Supprimer un enregistrement de l'historique (Swipe-to-Delete)
router.delete('/history/:historyId', protect, authorize('PARENT'), tripController.deleteHistoryItem);

module.exports = router;