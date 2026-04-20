const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Election = require('./Election');
const Student = require('./Student');
const Candidate = require('./Candidate');

const Vote = sequelize.define('Vote', {
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
  voter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  candidate_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'candidates',
      key: 'id'
    }
  },
  transaction_hash: {
    type: DataTypes.STRING(66),
    unique: true,
    validate: {
      is: /^0x[a-fA-F0-9]{64}$/
    }
  },
  block_number: {
    type: DataTypes.INTEGER
  },
  block_hash: {
    type: DataTypes.STRING(66)
  },
  gas_used: {
    type: DataTypes.INTEGER
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
    defaultValue: 'pending'
  },
  voter_ip: {
    type: DataTypes.INET
  },
  voter_user_agent: {
    type: DataTypes.TEXT
  },
  verified_on_chain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verification_time: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'votes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['election_id', 'voter_id']
    },
    {
      fields: ['transaction_hash']
    },
    {
      fields: ['candidate_id']
    }
  ]
});

// Associations
Vote.belongsTo(Election, { foreignKey: 'election_id', as: 'election' });
Vote.belongsTo(Student, { foreignKey: 'voter_id', as: 'voter' });
Vote.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

module.exports = Vote;