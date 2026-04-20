// src/models/DeanApplication.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const DeanApplication = sequelize.define('DeanApplication', {
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
  tableName: 'dean_applications',
  timestamps: true,
  underscored: true
});

DeanApplication.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });
DeanApplication.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

module.exports = DeanApplication;