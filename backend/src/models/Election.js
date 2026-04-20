const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Election = sequelize.define('Election', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'ended', 'published'),
    defaultValue: 'draft'
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  started_at: {
    type: DataTypes.DATE
  },
  ended_at: {
    type: DataTypes.DATE
  },
  results_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  published_at: {
    type: DataTypes.DATE
  },
  contract_address: {
    type: DataTypes.STRING(42)
  },
  results_data: {
    type: DataTypes.JSONB
  },
  total_voters: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_votes_cast: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'elections',
  timestamps: true,
  underscored: true,
  validate: {
    datesValid() {
      if (this.start_date && this.end_date && this.start_date >= this.end_date) {
        throw new Error('Start date must be before end date');
      }
    }
  }
});

// Associations
Election.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = Election;