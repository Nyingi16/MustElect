const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Student = require('./Student');

const CandidateApplication = sequelize.define('CandidateApplication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  manifesto: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  application_status: {
    type: DataTypes.ENUM('pending', 'commissioner_approved', 'commissioner_rejected', 'dean_approved', 'dean_rejected'),
    defaultValue: 'pending'
  },
  commissioner_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  commissioner_approved_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  commissioner_approved_at: {
    type: DataTypes.DATE
  },
  commissioner_comments: {
    type: DataTypes.TEXT
  },
  dean_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dean_approved_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dean_approved_at: {
    type: DataTypes.DATE
  },
  dean_comments: {
    type: DataTypes.TEXT
  },
  election_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'elections',
      key: 'id'
    }
  }
}, {
  tableName: 'candidate_applications',
  timestamps: true,
  underscored: true
});

// Associations
CandidateApplication.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
CandidateApplication.belongsTo(User, { foreignKey: 'commissioner_approved_by', as: 'commissioner' });
CandidateApplication.belongsTo(User, { foreignKey: 'dean_approved_by', as: 'dean' });

module.exports = CandidateApplication;