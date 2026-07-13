const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', authorize('PARENT'), notificationController.getMyNotifications);

// Cette route doit être définie avant /:id/read
router.put('/read-all', authorize('PARENT'), notificationController.markAllAsRead);

router.put('/:id/read', authorize('PARENT'), notificationController.markAsRead);

router.delete('/clear-all', authorize('PARENT'), notificationController.deleteAllNotifications);

module.exports = router;