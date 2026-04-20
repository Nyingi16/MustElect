// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { isDean } = require('../middleware/roleCheck');

// All routes require authentication
router.use(authenticateToken);

// Report generation and management (Dean only)
router.post('/generate', isDean, reportController.generateReport);
router.get('/list', isDean, reportController.listReports);

// Report access (available to authenticated users)
router.get('/download/:reportId', reportController.downloadReport);
router.get('/verify/:reportId', reportController.verifyReport);

module.exports = router;