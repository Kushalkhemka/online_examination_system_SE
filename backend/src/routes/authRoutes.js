const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { userValidation, validate } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/auth');

// Public routes
router.post('/register', userValidation.register, validate, authController.register);
router.post('/login', userValidation.login, validate, authController.login);

// Protected routes
router.post('/logout', isAuthenticated, authController.logout);
router.get('/me', isAuthenticated, authController.getCurrentUser);
router.put('/change-password', isAuthenticated, authController.changePassword);

module.exports = router;
