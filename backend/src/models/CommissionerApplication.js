// src/models/CommissionerApplication.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const CommissionerApplication = sequelize.define('CommissionerApplication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  justification: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  qualifications: {
    type: DataTypes.TEXT
  },
  experience: {
    type: DataTypes.TEXT
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' }
  },
  reviewed_at: {
    type: DataTypes.DATE
  },
  rejection_reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'commissioner_applications',
  timestamps: true,
  underscored: true
});

CommissionerApplication.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });
CommissionerApplication.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

module.exports = CommissionerApplication;