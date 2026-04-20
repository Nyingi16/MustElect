// src/models/Student.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Student = sequelize.define('Student', {
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
  department: {
    type: DataTypes.ENUM(
      'Computing & Informatics',
      'Education',
      'Business & Economics',
      'Agriculture & Food Sciences',
      'Engineering & Architecture',
      'Health Sciences',
      'Nursing'
    ),
    allowNull: true
  },
  year_of_study: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 }
  },
  registration_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  verified_by: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' }
  },
  verified_at: {
    type: DataTypes.DATE
  },
  has_voted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  voter_token: {
    type: DataTypes.STRING(255),
    unique: true
  },
  rejection_reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'students',
  timestamps: true,
  underscored: true
});

Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Student.belongsTo(User, { foreignKey: 'verified_by', as: 'verifier' });

module.exports = Student;