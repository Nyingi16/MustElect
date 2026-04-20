const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Student = require('./Student');
const Election = require('./Election');

const Candidate = sequelize.define('Candidate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  election_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elections',
      key: 'id'
    }
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
    type: DataTypes.TEXT
  },
  blockchain_id: {
    type: DataTypes.INTEGER,
    comment: 'Candidate ID on blockchain'
  },
  wallet_address: {
    type: DataTypes.STRING(42),
    validate: {
      is: /^0x[a-fA-F0-9]{40}$/
    }
  },
  vote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_winner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  profile_image: {
    type: DataTypes.STRING(500)
  },
  campaign_slogan: {
    type: DataTypes.STRING(255)
  },
  achievements: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'candidates',
  timestamps: true,
  underscored: true
});

// Associations
Candidate.belongsTo(Election, { foreignKey: 'election_id', as: 'election' });
Candidate.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Candidate.belongsTo(User, { foreignKey: 'student_id', through: Student, as: 'user' });

module.exports = Candidate;