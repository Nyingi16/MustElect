// src/routes/commissionerRoutes.js
const express = require('express');
const router = express.Router();
const commissionerController = require('../controllers/commissionerController');
const { authenticateToken } = require('../middleware/auth');
const { isCommissioner } = require('../middleware/roleCheck');

// All routes require commissioner role
router.use(authenticateToken);
router.use(isCommissioner);

// Application management
router.get('/applications/pending', commissionerController.getPendingApplications);
router.put('/applications/:applicationId/approve', commissionerController.approveApplication);
router.put('/applications/:applicationId/reject', commissionerController.rejectApplication);
router.get('/candidates/approved', commissionerController.getApprovedCandidates);

// Statistics
router.get('/stats/voters', commissionerController.getVoterStats);

module.exports = router;