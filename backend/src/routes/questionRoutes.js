const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { questionValidation, validate } = require('../middleware/validation');
const { isAuthenticated, isTeacherOrAdmin } = require('../middleware/auth');

// Question Bank routes
router.post('/banks', isAuthenticated, isTeacherOrAdmin, questionController.createQuestionBank);
router.get('/banks', isAuthenticated, questionController.getQuestionBanks);

// Question routes
router.post('/', isAuthenticated, isTeacherOrAdmin, questionValidation.create, validate, questionController.createQuestion);
router.get('/', isAuthenticated, questionController.getQuestions);
router.put('/:id', isAuthenticated, isTeacherOrAdmin, questionController.updateQuestion);
router.delete('/:id', isAuthenticated, isTeacherOrAdmin, questionController.deleteQuestion);

// Import/Export routes
router.post('/import', isAuthenticated, isTeacherOrAdmin, questionController.importQuestions);
router.get('/export', isAuthenticated, isTeacherOrAdmin, questionController.exportQuestions);

module.exports = router;
