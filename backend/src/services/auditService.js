const AuditLog = require('../models/AuditLog');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class AuditService {
  async logAction(userId, action, entityType, entityId, details, req = null) {
    try {
      return await AuditLog.create({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: req?.ip,
        user_agent: req?.get('User-Agent'),
        status: 'success'
      });
    } catch (error) {
      console.error('Audit log failed:', error);
      return null;
    }
  }

  async logError(userId, action, error, req = null) {
    try {
      return await AuditLog.create({
        user_id: userId,
        action,
        details: { error: error.message, stack: error.stack },
        ip_address: req?.ip,
        user_agent: req?.get('User-Agent'),
        status: 'failed',
        error_message: error.message
      });
    } catch (err) {
      console.error('Error log failed:', err);
      return null;
    }
  }

  async getAuditTrail(filters = {}) {
    const { userId, action, entityType, startDate, endDate, limit = 100, offset = 0 } = filters;
    
    const where = {};
    if (userId) where.user_id = userId;
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = startDate;
      if (endDate) where.created_at[Op.lte] = endDate;
    }
    
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: require('../models/User'),
        as: 'user',
        attributes: ['id', 'registration_number', 'full_name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      total: count,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit),
      logs: rows
    };
  }

  async getUserActivitySummary(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const actions = await AuditLog.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('action')), 'count']
      ],
      group: ['action']
    });
    
    const dailyActivity = await AuditLog.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });
    
    return {
      userId,
      period: `${days} days`,
      totalActions: await AuditLog.count({ where: { user_id: userId, created_at: { [Op.gte]: startDate } } }),
      actionBreakdown: actions,
      dailyActivity
    };
  }

  async getSystemAuditSummary(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const totalActions = await AuditLog.count({
      where: { created_at: { [Op.gte]: startDate } }
    });
    
    const failedActions = await AuditLog.count({
      where: {
        created_at: { [Op.gte]: startDate },
        status: 'failed'
      }
    });
    
    const actionTypes = await AuditLog.findAll({
      where: { created_at: { [Op.gte]: startDate } },
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('action')), 'count']
      ],
      group: ['action'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });
    
    const topUsers = await AuditLog.findAll({
      where: { created_at: { [Op.gte]: startDate } },
      attributes: [
        'user_id',
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
      ],
      include: [{
        model: require('../models/User'),
        as: 'user',
        attributes: ['full_name', 'registration_number', 'role']
      }],
      group: ['user_id', 'user.id'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });
    
    return {
      period: `${days} days`,
      totalActions,
      failedActions,
      successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions * 100).toFixed(2) : 100,
      topActions: actionTypes,
      mostActiveUsers: topUsers
    };
  }

  async cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const deleted = await AuditLog.destroy({
      where: {
        created_at: { [Op.lt]: cutoffDate }
      }
    });
    
    console.log(`Cleaned up ${deleted} audit logs older than ${daysToKeep} days`);
    return { deleted };
  }
}

module.exports = new AuditService();