const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { examValidation, validate } = require('../middleware/validation');
const { isAuthenticated, isTeacherOrAdmin } = require('../middleware/auth');

// Exam CRUD routes
router.post('/', isAuthenticated, isTeacherOrAdmin, examValidation.create, validate, examController.createExam);
router.get('/', isAuthenticated, examController.getExams);
router.get('/:id', isAuthenticated, examController.getExamById);
router.put('/:id', isAuthenticated, isTeacherOrAdmin, examController.updateExam);
router.delete('/:id', isAuthenticated, isTeacherOrAdmin, examController.deleteExam);

// Exam management routes
router.post('/:id/enroll', isAuthenticated, isTeacherOrAdmin, examController.enrollStudents);
router.get('/:id/enrollments', isAuthenticated, isTeacherOrAdmin, examController.getEnrolledStudents);
router.post('/:id/publish', isAuthenticated, isTeacherOrAdmin, examController.publishExam);

module.exports = router;
