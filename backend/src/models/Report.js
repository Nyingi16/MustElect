const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Election = require('./Election');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  report_type: {
    type: DataTypes.ENUM('results', 'turnout', 'audit', 'candidates', 'voters'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  election_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'elections',
      key: 'id'
    }
  },
  file_path: {
    type: DataTypes.STRING(500)
  },
  file_hash: {
    type: DataTypes.STRING(66),
    comment: 'SHA256 or IPFS hash'
  },
  file_size: {
    type: DataTypes.INTEGER,
    comment: 'File size in bytes'
  },
  mime_type: {
    type: DataTypes.STRING(50)
  },
  ipfs_hash: {
    type: DataTypes.STRING(100),
    comment: 'IPFS CID'
  },
  generated_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  report_data: {
    type: DataTypes.JSONB,
    comment: 'Stored report data for regeneration'
  },
  expires_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'reports',
  timestamps: true,
  underscored: true
});

// Associations
Report.belongsTo(User, { foreignKey: 'generated_by', as: 'generator' });
Report.belongsTo(Election, { foreignKey: 'election_id', as: 'election' });

module.exports = Report;