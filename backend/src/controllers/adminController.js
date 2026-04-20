// src/controllers/adminController.js
const { sequelize } = require('../config/database');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

// Get system statistics
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalAdmins = await User.count({ where: { role: 'admin' } });
    const totalDeans = await User.count({ where: { role: 'dean' } });
    const totalCommissioners = await User.count({ where: { role: 'commissioner' } });
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalCandidates = await User.count({ where: { role: 'candidate' } });
    
    res.json({
      users: {
        total: totalUsers,
        admin: totalAdmins,
        dean: totalDeans,
        commissioner: totalCommissioners,
        student: totalStudents,
        candidate: totalCandidates
      },
      system: {
        uptime: process.uptime(),
        node_version: process.version,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    const where = {};
    if (role && role !== 'all') where.role = role;
    if (search) {
      where[Op.or] = [
        { registration_number: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const users = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'refresh_token'] },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      total: users.count,
      page: parseInt(page),
      totalPages: Math.ceil(users.count / limit),
      users: users.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    const validRoles = ['student', 'candidate', 'commissioner', 'dean'];
    if (!validRoles.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ role }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE_USER_ROLE',
      details: { userId, oldRole: user.role, newRole: role },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'User role updated successfully', user: user.toJSON() });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ is_active: !user.is_active }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'TOGGLE_USER_STATUS',
      details: { userId, newStatus: !user.is_active },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
};

// Add commissioner
exports.addCommissioner = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.body;
    
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ role: 'commissioner' }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'ADD_COMMISSIONER',
      details: { userId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Commissioner added successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to add commissioner' });
  }
};

// Remove commissioner
exports.removeCommissioner = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role !== 'commissioner') {
      await transaction.rollback();
      return res.status(400).json({ error: 'User is not a commissioner' });
    }
    
    await user.update({ role: 'student' }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'REMOVE_COMMISSIONER',
      details: { userId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Commissioner removed successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to remove commissioner' });
  }
};

// Set dean
exports.setDean = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.body;
    
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ role: 'dean' }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'SET_DEAN',
      details: { userId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Dean assigned successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to set dean' });
  }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    
    const where = {};
    if (action) where.action = action;
    if (userId) where.user_id = userId;
    
    const logs = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number'] }]
    });
    
    res.json({
      total: logs.count,
      page: parseInt(page),
      totalPages: Math.ceil(logs.count / limit),
      logs: logs.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Create backup
exports.createBackup = async (req, res) => {
  try {
    // This would create a database backup
    // For now, return success
    res.json({ 
      message: 'Backup created successfully', 
      backup_file: `backup_${Date.now()}.sql`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
};

// Restore backup
exports.restoreBackup = async (req, res) => {
  try {
    res.json({ message: 'Restore functionality coming soon' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
};

// Get system logs
exports.getSystemLogs = async (req, res) => {
  try {
    res.json({ message: 'System logs coming soon' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    res.json({
      system_name: 'MUST Elections',
      version: '1.0.0',
      election_default_duration: 2,
      email_verification_required: true,
      wallet_required: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    // This would update system settings
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Export audit logs
exports.exportAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      limit: 10000,
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number'] }]
    });
    
    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role === 'admin') {
      await transaction.rollback();
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    await user.destroy({ transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE_USER',
      details: { userId, userEmail: user.email },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
// src/controllers/adminController.js - Add these functions

// Get pending dean applications
exports.getPendingDeanApplications = async (req, res) => {
  try {
    const applications = await DeanApplication.findAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        as: 'applicant',
        attributes: ['id', 'full_name', 'registration_number', 'email', 'phone_number', 'bio']
      }],
      order: [['created_at', 'ASC']]
    });
    
    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dean applications' });
  }
};

// Get pending commissioner applications
exports.getPendingCommissionerApplications = async (req, res) => {
  try {
    const applications = await CommissionerApplication.findAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        as: 'applicant',
        attributes: ['id', 'full_name', 'registration_number', 'email', 'phone_number', 'bio']
      }],
      order: [['created_at', 'ASC']]
    });
    
    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch commissioner applications' });
  }
};

// Approve dean application
exports.approveDeanApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { applicationId } = req.params;
    
    const application = await DeanApplication.findByPk(applicationId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Application already processed' });
    }
    
    // Update application status
    await application.update({
      status: 'approved',
      reviewed_by: req.user.id,
      reviewed_at: new Date()
    }, { transaction });
    
    // Update user role to dean
    const user = await User.findByPk(application.user_id, { transaction });
    await user.update({ role: 'dean' }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'APPROVE_DEAN_APPLICATION',
      details: { applicationId, userId: application.user_id },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Dean application approved successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to approve dean application' });
  }
};

// Approve commissioner application
exports.approveCommissionerApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { applicationId } = req.params;
    
    const application = await CommissionerApplication.findByPk(applicationId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Application already processed' });
    }
    
    // Update application status
    await application.update({
      status: 'approved',
      reviewed_by: req.user.id,
      reviewed_at: new Date()
    }, { transaction });
    
    // Update user role to commissioner
    const user = await User.findByPk(application.user_id, { transaction });
    await user.update({ role: 'commissioner' }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'APPROVE_COMMISSIONER_APPLICATION',
      details: { applicationId, userId: application.user_id },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Commissioner application approved successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to approve commissioner application' });
  }
};

// Reject dean application
exports.rejectDeanApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const application = await DeanApplication.findByPk(applicationId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.update({
      status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      rejection_reason: reason
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'REJECT_DEAN_APPLICATION',
      details: { applicationId, userId: application.user_id, reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Dean application rejected' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to reject dean application' });
  }
};

// Reject commissioner application
exports.rejectCommissionerApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const application = await CommissionerApplication.findByPk(applicationId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.update({
      status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      rejection_reason: reason
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'REJECT_COMMISSIONER_APPLICATION',
      details: { applicationId, userId: application.user_id, reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Commissioner application rejected' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to reject commissioner application' });
  }
};