// src/routes/blockchainRoutes.js
const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticateToken } = require('../middleware/auth');
const { isDean } = require('../middleware/roleCheck');

// Public blockchain info (no auth required)
router.get('/contract-info', blockchainController.getContractInfo);
router.get('/vote/verify/:transactionHash', blockchainController.verifyVote);

// Admin blockchain operations (Dean only)
router.use(authenticateToken);
router.use(isDean);
router.post('/sync-votes', blockchainController.syncVotesFromBlockchain);

module.exports = router;