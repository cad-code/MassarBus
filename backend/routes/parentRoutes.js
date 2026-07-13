const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Sécurité : Seuls les utilisateurs connectés et ayant le rôle PARENT peuvent accéder
router.use(protect);
router.use(authorize('PARENT'));

// Route : GET /api/parents/my-children
router.get('/my-children', parentController.getMyChildren);

module.exports = router;