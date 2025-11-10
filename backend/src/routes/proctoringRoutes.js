const express = require('express');
const router = express.Router();
const multer = require('multer');
const proctoringController = require('../controllers/proctoringController');
const { isAuthenticated, isStudent, isTeacherOrAdmin } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// Student proctoring routes
router.post('/initialize', isAuthenticated, isStudent, proctoringController.initializeProctoringSession);
router.post('/verify', isAuthenticated, isStudent, proctoringController.completePreExamVerification);
router.post('/event', isAuthenticated, isStudent, proctoringController.logProctoringEvent);
router.post('/upload', isAuthenticated, isStudent, upload.single('recording'), proctoringController.uploadProctoringRecording);
router.post('/analyze-frame', isAuthenticated, isStudent, proctoringController.analyzeProctoringFrame);

// Teacher/Admin routes
router.get('/session/:session_id', isAuthenticated, isTeacherOrAdmin, proctoringController.getProctoringSession);
router.post('/report/:attempt_id/generate', isAuthenticated, isTeacherOrAdmin, proctoringController.generateProctoringReport);
router.get('/report/:attempt_id', isAuthenticated, isTeacherOrAdmin, proctoringController.getProctoringReport);

module.exports = router;
