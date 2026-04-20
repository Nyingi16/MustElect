// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');

// All routes require Admin role
router.use(authenticateToken);
router.use(isAdmin);

// Role Application Management
router.get('/applications/dean/pending', adminController.getPendingDeanApplications);
router.get('/applications/commissioner/pending', adminController.getPendingCommissionerApplications);
router.put('/applications/dean/:applicationId/approve', adminController.approveDeanApplication);
router.put('/applications/dean/:applicationId/reject', adminController.rejectDeanApplication);
router.put('/applications/commissioner/:applicationId/approve', adminController.approveCommissionerApplication);
router.put('/applications/commissioner/:applicationId/reject', adminController.rejectCommissionerApplication);

// System Management
router.get('/system/stats', adminController.getSystemStats);
router.get('/system/logs', adminController.getSystemLogs);
router.get('/system/backup', adminController.createBackup);
router.post('/system/restore', adminController.restoreBackup);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Role Management
router.post('/roles/commissioner', adminController.addCommissioner);
router.delete('/roles/commissioner/:userId', adminController.removeCommissioner);
router.post('/roles/dean', adminController.setDean);

// System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Audit & Logs
router.get('/audit', adminController.getAuditLogs);
router.get('/audit/export', adminController.exportAuditLogs);

module.exports = router;