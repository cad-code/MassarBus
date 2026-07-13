// backend/routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Sécurité : Réservé à l'administration
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', routeController.getAllRoutes);
router.post('/', routeController.createRoute);
router.put('/:id', routeController.updateRoute);    
router.delete('/:id', routeController.deleteRoute); 

module.exports = router;