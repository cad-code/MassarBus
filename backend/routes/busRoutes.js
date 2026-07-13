// backend/routes/busRoutes.js
const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Accès réservé aux administrateurs
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', busController.getAllBuses);
router.post('/', busController.createBus);
router.put('/:id', busController.updateBus);
router.delete('/:id', busController.deleteBus);

module.exports = router;