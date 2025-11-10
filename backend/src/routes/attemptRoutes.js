const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { isAuthenticated, isStudent, isTeacherOrAdmin } = require('../middleware/auth');

// Student routes
router.post('/start', isAuthenticated, isStudent, attemptController.startExamAttempt);
router.post('/save-answer', isAuthenticated, isStudent, attemptController.saveAnswer);
router.post('/submit', isAuthenticated, isStudent, attemptController.submitExam);
router.get('/my-attempts', isAuthenticated, isStudent, attemptController.getMyAttempts);
router.get('/:attempt_id/results', isAuthenticated, attemptController.getAttemptResults);

// Teacher/Admin routes
router.get('/exam/:exam_id', isAuthenticated, isTeacherOrAdmin, attemptController.getExamAttempts);

module.exports = router;
