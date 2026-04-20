// src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/auth');
const { isStudent } = require('../middleware/roleCheck');
const { voteLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and student role
router.use(authenticateToken);
router.use(isStudent);

// Dashboard & Profile
router.get('/dashboard', studentController.getDashboard);
router.get('/election-status', studentController.getElectionStatus);
router.put('/profile', studentController.updateProfile);

// Candidates
router.get('/candidates/:electionId', studentController.getCandidates);

// Voting
router.get('/vote/receipt', studentController.getVoteReceipt);
router.post('/vote', voteLimiter, studentController.castVote);

// Results
router.get('/results/:electionId', studentController.getResults);

module.exports = router;