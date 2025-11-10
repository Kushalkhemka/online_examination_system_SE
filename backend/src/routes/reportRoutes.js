const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated, isTeacherOrAdmin } = require('../middleware/auth');

// Dashboard stats
router.get('/dashboard', isAuthenticated, reportController.getDashboardStats);

// Performance reports
router.get('/student/:student_id/performance', isAuthenticated, isTeacherOrAdmin, reportController.getStudentPerformanceReport);
router.get('/class/:exam_id/performance', isAuthenticated, isTeacherOrAdmin, reportController.getClassPerformanceReport);
router.get('/question-analysis/:exam_id', isAuthenticated, isTeacherOrAdmin, reportController.getQuestionWiseAnalysis);

module.exports = router;
