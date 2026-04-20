// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify-otp', authLimiter, authController.verifyOTP);
router.post('/resend-otp', authLimiter, authController.resendOTP);
router.post('/complete-profile', authController.completeProfile);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Helper endpoints
router.get('/check-email', authController.checkEmailStatus);
router.post('/test-email', authController.testEmail);

// Protected routes
router.post('/connect-wallet', authenticateToken, authController.connectWallet);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;