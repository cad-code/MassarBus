// backend/routes/tripLocationRoutes.js
const express = require('express');
const router = express.Router();
const tripLocationController = require('../controllers/tripLocationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('ADMIN'));

// Note : le :tripId est un paramètre dynamique dans l'URL
router.get('/:tripId', tripLocationController.getTripHistory);

module.exports = router;