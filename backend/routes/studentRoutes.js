// backend/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// Routes dédiées à l'administration
router.post('/', authorize('ADMIN'), studentController.createStudent);
router.get('/', authorize('ADMIN'), studentController.getAllStudents);
router.delete('/:id', authorize('ADMIN'),studentController.deleteStudent);

// Routes dédiées à l'application mobile des parents
router.get('/my-children', authorize('PARENT'), studentController.getMyChildren);
router.put('/:id/attendance', authorize('PARENT'), studentController.toggleAbsence);
// Routes dédiées à l'application mobile des choufeurs
router.put('/:id/status', protect, authorize('DRIVER'), studentController.updateStudentStatus);

module.exports = router;