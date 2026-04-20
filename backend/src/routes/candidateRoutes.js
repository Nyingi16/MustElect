// src/routes/candidateRoutes.js
const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticateToken } = require('../middleware/auth');
const { isCandidate } = require('../middleware/roleCheck');

// All routes require authentication
router.use(authenticateToken);

// Application routes (available to all authenticated users)
router.post('/apply', candidateController.applyAsCandidate);
router.get('/application-status', candidateController.getApplicationStatus);
router.delete('/withdraw', candidateController.withdrawApplication);

// Candidate-only routes
router.put('/manifesto', isCandidate, candidateController.updateManifesto);
router.get('/campaign-stats', isCandidate, candidateController.getCampaignStats);

module.exports = router;