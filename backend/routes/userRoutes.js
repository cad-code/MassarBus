// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);


// Route pour mettre à jour le token FCM
router.put('/update-fcm-token', userController.updateFcmToken);

// Route pour récupérer le profil du parent
router.get('/profile', userController.getParentProfile);

router.use(authorize('ADMIN'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;