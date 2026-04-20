const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(50)
  },
  entity_id: {
    type: DataTypes.INTEGER
  },
  details: {
    type: DataTypes.JSONB
  },
  ip_address: {
    type: DataTypes.INET
  },
  user_agent: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'success'
  },
  error_message: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = AuditLog;