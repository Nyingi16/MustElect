// src/routes/deanRoutes.js
const express = require('express');
const router = express.Router();
const deanController = require('../controllers/deanController');
const { authenticateToken } = require('../middleware/auth');
const { isDean } = require('../middleware/roleCheck');

// All routes require Dean role
router.use(authenticateToken);
router.use(isDean);

// ============ DASHBOARD ============
router.get('/dashboard/stats', deanController.getDashboardStats);
router.get('/dashboard/realtime', deanController.getRealTimeStats);

// ============ STUDENT MANAGEMENT ============
router.get('/students', deanController.getStudents);
router.get('/students/:studentId', deanController.getStudentDetails);
router.put('/students/:studentId/verify', deanController.verifyStudent);
router.put('/students/:studentId/reject', deanController.rejectStudent);
router.post('/students/bulk-verify', deanController.bulkVerifyStudents);
router.get('/students/export', deanController.exportStudents);

// ============ ELECTION MANAGEMENT ============
router.post('/elections', deanController.createElection);
router.get('/elections', deanController.getElections);
router.get('/elections/:electionId', deanController.getElectionDetails);
router.put('/elections/:electionId/start', deanController.startElection);
router.put('/elections/:electionId/pause', deanController.pauseElection);
router.put('/elections/:electionId/end', deanController.endElection);
router.put('/elections/:electionId/publish', deanController.publishResults);
router.delete('/elections/:electionId', deanController.deleteElection);
router.get('/elections/:electionId/stats', deanController.getRealTimeStats);

// ============ CANDIDATE MANAGEMENT ============
router.get('/candidates', deanController.getCandidates);
router.put('/candidates/:candidateId/approve', deanController.approveCandidate);
router.put('/candidates/:candidateId/reject', deanController.rejectCandidate);

// ============ RESULTS & REPORTS ============
router.get('/results/:electionId', deanController.getResults);
router.get('/reports/turnout/:electionId', deanController.getTurnoutReport);

module.exports = router;